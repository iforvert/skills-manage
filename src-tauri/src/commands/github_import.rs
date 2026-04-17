use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};
use tauri::State;

use crate::{
    db::{self, DbPool, Skill},
    AppState,
};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepoRef {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub normalized_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DuplicateResolution {
    Overwrite,
    Skip,
    Rename,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubSkillConflict {
    pub existing_skill_id: String,
    pub existing_name: String,
    pub existing_canonical_path: Option<String>,
    pub proposed_skill_id: String,
    pub proposed_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubSkillPreview {
    pub source_path: String,
    pub skill_id: String,
    pub skill_name: String,
    pub description: Option<String>,
    pub root_directory: String,
    pub skill_directory_name: String,
    pub download_url: String,
    pub conflict: Option<GitHubSkillConflict>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepoPreview {
    pub repo: GitHubRepoRef,
    pub skills: Vec<GitHubSkillPreview>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubSkillImportSelection {
    pub source_path: String,
    pub resolution: DuplicateResolution,
    pub renamed_skill_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportedGitHubSkillSummary {
    pub source_path: String,
    pub original_skill_id: String,
    pub imported_skill_id: String,
    pub skill_name: String,
    pub target_directory: String,
    pub resolution: DuplicateResolution,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepoImportResult {
    pub repo: GitHubRepoRef,
    pub imported_skills: Vec<ImportedGitHubSkillSummary>,
    pub skipped_skills: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct GitHubContent {
    name: String,
    #[serde(rename = "type")]
    content_type: String,
    path: String,
    download_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SkillFrontmatter {
    name: String,
    description: Option<String>,
}

#[derive(Debug, Clone)]
struct RemoteSkillCandidate {
    source_path: String,
    skill_id: String,
    skill_name: String,
    description: Option<String>,
    root_directory: String,
    skill_directory_name: String,
    download_url: String,
}

#[derive(Clone)]
struct GitHubRepoFixture {
    root_contents: Vec<GitHubContent>,
    directory_contents: std::collections::HashMap<String, Vec<GitHubContent>>,
    raw_files: std::collections::HashMap<String, String>,
}

#[tauri::command]
pub async fn preview_github_repo_import(
    state: State<'_, AppState>,
    repo_url: String,
) -> Result<GitHubRepoPreview, String> {
    preview_github_repo_import_impl(&state.db, &repo_url).await
}

#[tauri::command]
pub async fn import_github_repo_skills(
    state: State<'_, AppState>,
    repo_url: String,
    selections: Vec<GitHubSkillImportSelection>,
) -> Result<GitHubRepoImportResult, String> {
    import_github_repo_skills_impl(&state.db, &repo_url, selections).await
}

async fn preview_github_repo_import_impl(
    pool: &DbPool,
    repo_url: &str,
) -> Result<GitHubRepoPreview, String> {
    let repo = resolve_repo_ref(repo_url).await?;
    let candidates = fetch_repo_skill_candidates(&repo).await?;
    let skills = build_preview_skills(pool, &candidates).await?;

    if skills.is_empty() {
        return Err(
            "No importable skills found in this repository. Supported layouts are repo-root skill directories or a top-level skills/ directory."
                .to_string(),
        );
    }

    Ok(GitHubRepoPreview { repo, skills })
}

async fn import_github_repo_skills_impl(
    pool: &DbPool,
    repo_url: &str,
    selections: Vec<GitHubSkillImportSelection>,
) -> Result<GitHubRepoImportResult, String> {
    let repo = resolve_repo_ref(repo_url).await?;
    let candidates = fetch_repo_skill_candidates(&repo).await?;
    if candidates.is_empty() {
        return Err(
            "No importable skills found in this repository. Supported layouts are repo-root skill directories or a top-level skills/ directory."
                .to_string(),
        );
    }

    if selections.is_empty() {
        return Err("Select at least one skill to import.".to_string());
    }

    let mut selected_paths = HashSet::new();
    let mut selected = Vec::new();
    for selection in selections {
        let candidate = candidates
            .iter()
            .find(|candidate| candidate.source_path == selection.source_path)
            .ok_or_else(|| format!("Selected skill '{}' is no longer available in the preview.", selection.source_path))?
            .clone();

        if !selected_paths.insert(candidate.source_path.clone()) {
            return Err(format!(
                "Skill '{}' was selected more than once.",
                candidate.source_path
            ));
        }

        selected.push((candidate, selection));
    }

    let central_root = central_skills_root(pool).await?;
    std::fs::create_dir_all(&central_root)
        .map_err(|e| format!("Failed to create central skills directory: {}", e))?;

    let mut occupied_ids = current_central_skill_ids(pool).await?;
    let mut staging_ops = Vec::new();
    let mut skipped_skills = Vec::new();

    for (candidate, selection) in &selected {
        match selection.resolution {
            DuplicateResolution::Skip => {
                skipped_skills.push(candidate.source_path.clone());
                continue;
            }
            DuplicateResolution::Overwrite => {
                if let Some(existing) = db::get_skill_by_id(pool, &candidate.skill_id).await? {
                    if !existing.is_central {
                        return Err(format!(
                            "Skill '{}' conflicts with a non-central record and cannot be overwritten safely.",
                            candidate.skill_id
                        ));
                    }
                }
                occupied_ids.insert(candidate.skill_id.clone());
                staging_ops.push(StagedImport {
                    candidate: candidate.clone(),
                    final_skill_id: candidate.skill_id.clone(),
                    resolution: DuplicateResolution::Overwrite,
                });
            }
            DuplicateResolution::Rename => {
                let requested_id = sanitize_skill_id(
                    selection
                        .renamed_skill_id
                        .as_deref()
                        .ok_or_else(|| {
                            format!(
                                "Skill '{}' requires a renamed skill id for rename resolution.",
                                candidate.source_path
                            )
                        })?,
                )?;
                if occupied_ids.contains(&requested_id) {
                    return Err(format!(
                        "Renamed skill id '{}' is already in use.",
                        requested_id
                    ));
                }
                occupied_ids.insert(requested_id.clone());
                staging_ops.push(StagedImport {
                    candidate: candidate.clone(),
                    final_skill_id: requested_id,
                    resolution: DuplicateResolution::Rename,
                });
            }
        }
    }

    if staging_ops.is_empty() && skipped_skills.is_empty() {
        return Err("No valid import operations were requested.".to_string());
    }

    let mut imported_skills = Vec::new();
    let mut created_paths = Vec::new();

    for op in &staging_ops {
        let target_dir = central_root.join(&op.final_skill_id);
        if target_dir.exists() {
            if op.resolution == DuplicateResolution::Overwrite {
                std::fs::remove_dir_all(&target_dir).map_err(|e| {
                    format!(
                        "Failed to replace existing canonical skill '{}': {}",
                        op.final_skill_id, e
                    )
                })?;
            } else {
                cleanup_created_directories(&created_paths);
                return Err(format!(
                    "Target directory '{}' already exists.",
                    target_dir.display()
                ));
            }
        }

        if let Err(error) = download_directory_recursive(&repo, &op.candidate.source_path, &target_dir).await
        {
            cleanup_created_directories(&created_paths);
            if target_dir.exists() {
                let _ = std::fs::remove_dir_all(&target_dir);
            }
            return Err(error);
        }

        created_paths.push(target_dir.clone());

        let skill_md_path = target_dir.join("SKILL.md");
        let raw = std::fs::read_to_string(&skill_md_path)
            .map_err(|e| format!("Failed to read imported SKILL.md: {}", e))?;
        let frontmatter = parse_frontmatter(&raw)
            .ok_or_else(|| format!("Imported skill '{}' is missing valid frontmatter.", op.candidate.source_path))?;

        let db_skill = Skill {
            id: op.final_skill_id.clone(),
            name: frontmatter.name.clone(),
            description: frontmatter.description.clone(),
            file_path: skill_md_path.to_string_lossy().into_owned(),
            canonical_path: Some(target_dir.to_string_lossy().into_owned()),
            is_central: true,
            source: Some(format!("github:{}/{}", repo.owner, repo.repo)),
            content: None,
            scanned_at: Utc::now().to_rfc3339(),
        };
        db::upsert_skill(pool, &db_skill).await?;

        imported_skills.push(ImportedGitHubSkillSummary {
            source_path: op.candidate.source_path.clone(),
            original_skill_id: op.candidate.skill_id.clone(),
            imported_skill_id: op.final_skill_id.clone(),
            skill_name: frontmatter.name,
            target_directory: target_dir.to_string_lossy().into_owned(),
            resolution: op.resolution.clone(),
        });
    }

    Ok(GitHubRepoImportResult {
        repo,
        imported_skills,
        skipped_skills,
    })
}

#[derive(Debug, Clone)]
struct StagedImport {
    candidate: RemoteSkillCandidate,
    final_skill_id: String,
    resolution: DuplicateResolution,
}

fn cleanup_created_directories(paths: &[PathBuf]) {
    for path in paths.iter().rev() {
        let _ = std::fs::remove_dir_all(path);
    }
}

async fn central_skills_root(pool: &DbPool) -> Result<PathBuf, String> {
    let central = db::get_agent_by_id(pool, "central")
        .await?
        .ok_or_else(|| "Central agent not found in database".to_string())?;
    Ok(PathBuf::from(central.global_skills_dir))
}

async fn current_central_skill_ids(pool: &DbPool) -> Result<HashSet<String>, String> {
    let rows = sqlx::query("SELECT id FROM skills WHERE is_central = 1")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(rows
        .iter()
        .map(|row| row.get::<String, _>("id"))
        .collect::<HashSet<_>>())
}

async fn build_preview_skills(
    pool: &DbPool,
    candidates: &[RemoteSkillCandidate],
) -> Result<Vec<GitHubSkillPreview>, String> {
    let mut skills = Vec::with_capacity(candidates.len());
    for candidate in candidates {
        let existing = db::get_skill_by_id(pool, &candidate.skill_id).await?;
        let conflict = existing.and_then(|existing| {
            if existing.is_central {
                Some(GitHubSkillConflict {
                    existing_skill_id: existing.id,
                    existing_name: existing.name,
                    existing_canonical_path: existing.canonical_path,
                    proposed_skill_id: candidate.skill_id.clone(),
                    proposed_name: candidate.skill_name.clone(),
                })
            } else {
                None
            }
        });

        skills.push(GitHubSkillPreview {
            source_path: candidate.source_path.clone(),
            skill_id: candidate.skill_id.clone(),
            skill_name: candidate.skill_name.clone(),
            description: candidate.description.clone(),
            root_directory: candidate.root_directory.clone(),
            skill_directory_name: candidate.skill_directory_name.clone(),
            download_url: candidate.download_url.clone(),
            conflict,
        });
    }
    Ok(skills)
}

async fn resolve_repo_ref(repo_url: &str) -> Result<GitHubRepoRef, String> {
    let (owner, repo) = parse_github_url(repo_url)?;
    let client = github_client()?;
    let branch_url = format!("https://api.github.com/repos/{owner}/{repo}");
    let response = client
        .get(&branch_url)
        .send()
        .await
        .map_err(|e| format!("Failed to inspect GitHub repository: {}", e))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err("GitHub repository not found.".to_string());
    }
    if !response.status().is_success() {
        return Err(format!(
            "Failed to inspect GitHub repository: HTTP {}",
            response.status()
        ));
    }

    let payload: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let branch = payload
        .get("default_branch")
        .and_then(|v| v.as_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("main")
        .to_string();

    Ok(GitHubRepoRef {
        owner: owner.clone(),
        repo: repo.clone(),
        branch,
        normalized_url: format!("https://github.com/{owner}/{repo}"),
    })
}

fn github_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("skills-manage/0.1.0")
        .build()
        .map_err(|e| e.to_string())
}

fn parse_github_url(url: &str) -> Result<(String, String), String> {
    let trimmed = url.trim();
    let parsed = reqwest::Url::parse(trimmed)
        .map_err(|_| "Invalid GitHub repository URL.".to_string())?;

    if parsed.scheme() != "https" {
        return Err("Only https:// GitHub repository URLs are supported.".to_string());
    }
    if parsed.host_str() != Some("github.com") {
        return Err("Only github.com repository URLs are supported.".to_string());
    }

    let mut segments = parsed
        .path_segments()
        .ok_or_else(|| "Invalid GitHub repository URL.".to_string())?;
    let owner = segments
        .next()
        .filter(|segment| !segment.is_empty())
        .ok_or_else(|| "GitHub repository URL must include an owner.".to_string())?;
    let repo = segments
        .next()
        .filter(|segment| !segment.is_empty())
        .ok_or_else(|| "GitHub repository URL must include a repository name.".to_string())?;

    let repo = repo.strip_suffix(".git").unwrap_or(repo);
    if owner.is_empty() || repo.is_empty() {
        return Err("GitHub repository URL is missing owner or repository.".to_string());
    }

    Ok((owner.to_lowercase(), repo.to_lowercase()))
}

async fn fetch_repo_skill_candidates(repo: &GitHubRepoRef) -> Result<Vec<RemoteSkillCandidate>, String> {
    fetch_repo_skill_candidates_with_fixture(repo, None).await
}

async fn fetch_repo_skill_candidates_with_fixture(
    repo: &GitHubRepoRef,
    fixture: Option<&GitHubRepoFixture>,
) -> Result<Vec<RemoteSkillCandidate>, String> {
    let client = github_client()?;
    let mut candidates = Vec::new();
    let mut seen_paths = HashSet::new();
    let root_contents = match fixture {
        Some(fixture) => fixture.root_contents.clone(),
        None => fetch_directory_contents(&client, repo, "").await?,
    };
    if root_contents
        .iter()
        .any(|entry| entry.content_type == "file" && entry.name.eq_ignore_ascii_case("SKILL.md"))
    {
        let root_skill_md = root_contents
            .iter()
            .find(|entry| entry.content_type == "file" && entry.name.eq_ignore_ascii_case("SKILL.md"))
            .expect("root SKILL exists");
        let raw_url = root_skill_md.download_url.clone().unwrap_or_else(|| {
            format!(
                "https://raw.githubusercontent.com/{}/{}/{}/SKILL.md",
                repo.owner, repo.repo, repo.branch
            )
        });
        let skill_raw = if let Some(fixture) = fixture {
            fixture
                .raw_files
                .get("SKILL.md")
                .cloned()
                .ok_or_else(|| "Missing fixture root SKILL.md".to_string())?
        } else {
            fetch_raw_text(&client, &raw_url).await?
        };
        let frontmatter = parse_frontmatter(&skill_raw)
            .ok_or_else(|| "Repository root SKILL.md is missing valid frontmatter.".to_string())?;
        let root_skill_id = sanitize_skill_id(&repo.repo)?;
        let fallback_root_skill_id = root_skill_id.strip_suffix("-skill").unwrap_or(&root_skill_id).to_string();
        candidates.push(RemoteSkillCandidate {
            source_path: ".".to_string(),
            skill_id: fallback_root_skill_id,
            skill_name: frontmatter.name,
            description: frontmatter.description,
            root_directory: "/".to_string(),
            skill_directory_name: repo.repo.clone(),
            download_url: raw_url,
        });
        seen_paths.insert(".".to_string());
    }

    for base_path in ["", "skills"] {
        let contents = if base_path.is_empty() {
            root_contents.clone()
        } else {
            let fetched = if let Some(fixture) = fixture {
                fixture.directory_contents.get(base_path).cloned().ok_or_else(|| {
                    format!("GitHub repository contents path '{}' returned HTTP 404", base_path)
                })
            } else {
                fetch_directory_contents(&client, repo, base_path).await
            };
            match fetched {
                Ok(contents) => contents,
                Err(error) if base_path == "skills" && error.contains("404") => continue,
                Err(error) => return Err(error),
            }
        };

        for entry in contents
            .iter()
            .filter(|entry| entry.content_type == "dir" && entry.name != ".github")
        {
            let skill_dir_contents =
                match if let Some(fixture) = fixture {
                    fixture
                        .directory_contents
                        .get(entry.path.as_str())
                        .cloned()
                        .ok_or_else(|| {
                            format!(
                                "GitHub repository contents path '{}' returned HTTP 404",
                                entry.path
                            )
                        })
                } else {
                    fetch_directory_contents(&client, repo, entry.path.as_str()).await
                } {
                    Ok(contents) => contents,
                    Err(_) => continue,
                };

            let skill_md = skill_dir_contents.iter().find(|content| {
                content.content_type == "file" && content.name.eq_ignore_ascii_case("SKILL.md")
            });

            let Some(skill_md) = skill_md else {
                continue;
            };

            if !seen_paths.insert(entry.path.clone()) {
                continue;
            }

            let raw_url = skill_md.download_url.clone().unwrap_or_else(|| {
                format!(
                    "https://raw.githubusercontent.com/{}/{}/{}/{}",
                    repo.owner, repo.repo, repo.branch, skill_md.path
                )
            });

            let skill_raw = if let Some(fixture) = fixture {
                fixture
                    .raw_files
                    .get(skill_md.path.as_str())
                    .cloned()
                    .ok_or_else(|| format!("Missing fixture file '{}'.", skill_md.path))?
            } else {
                fetch_raw_text(&client, &raw_url).await?
            };
            let frontmatter = parse_frontmatter(&skill_raw)
                .ok_or_else(|| format!("Skill '{}' is missing valid frontmatter.", entry.path))?;

            candidates.push(RemoteSkillCandidate {
                source_path: entry.path.clone(),
                skill_id: sanitize_skill_id(&entry.name)?,
                skill_name: frontmatter.name,
                description: frontmatter.description,
                root_directory: if base_path.is_empty() {
                    "/".to_string()
                } else {
                    base_path.to_string()
                },
                skill_directory_name: entry.name.clone(),
                download_url: raw_url,
            });
        }
    }

    Ok(candidates)
}

async fn download_directory_recursive(
    repo: &GitHubRepoRef,
    source_path: &str,
    target_dir: &Path,
) -> Result<(), String> {
    let client = github_client()?;
    std::fs::create_dir_all(target_dir)
        .map_err(|e| format!("Failed to create import target directory: {}", e))?;

    download_directory_recursive_with_client(&client, repo, source_path, target_dir).await
}

async fn download_directory_recursive_with_client(
    client: &reqwest::Client,
    repo: &GitHubRepoRef,
    source_path: &str,
    target_dir: &Path,
) -> Result<(), String> {
    if source_path == "." {
        let contents = fetch_directory_contents(client, repo, "").await?;
        for entry in contents.into_iter().filter(|entry| entry.content_type == "file") {
            if !is_safe_repo_relative_path(&entry.path) {
                return Err(format!(
                    "Repository contains an unsupported path '{}'.",
                    entry.path
                ));
            }
            let destination = target_dir.join(&entry.path);
            let parent = destination
                .parent()
                .ok_or_else(|| "Failed to determine imported file parent directory.".to_string())?;
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create imported file parent directory: {}", e))?;
            let url = entry.download_url.clone().ok_or_else(|| {
                format!(
                    "GitHub did not return a downloadable URL for '{}'.",
                    entry.path
                )
            })?;
            let bytes = client
                .get(&url)
                .send()
                .await
                .map_err(|e| format!("Failed to download '{}': {}", entry.path, e))?
                .error_for_status()
                .map_err(|e| format!("Failed to download '{}': {}", entry.path, e))?
                .bytes()
                .await
                .map_err(|e| format!("Failed to read '{}': {}", entry.path, e))?;
            std::fs::write(&destination, &bytes)
                .map_err(|e| format!("Failed to write imported file '{}': {}", destination.display(), e))?;
        }
        return Ok(());
    }

    let contents = fetch_directory_contents(client, repo, source_path).await?;

    for entry in contents {
        let relative = entry
            .path
            .strip_prefix(source_path)
            .unwrap_or(entry.path.as_str())
            .trim_start_matches('/');
        let destination = if relative.is_empty() {
            target_dir.to_path_buf()
        } else {
            target_dir.join(relative)
        };

        match entry.content_type.as_str() {
            "dir" => {
                std::fs::create_dir_all(&destination)
                    .map_err(|e| format!("Failed to create imported directory: {}", e))?;
                Box::pin(download_directory_recursive_with_client(
                    client,
                    repo,
                    &entry.path,
                    &destination,
                ))
                .await?;
            }
            "file" => {
                if !is_safe_repo_relative_path(relative) {
                    return Err(format!(
                        "Repository contains an unsupported path '{}'.",
                        entry.path
                    ));
                }
                let parent = destination
                    .parent()
                    .ok_or_else(|| "Failed to determine imported file parent directory.".to_string())?;
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create imported file parent directory: {}", e))?;
                let url = entry.download_url.clone().ok_or_else(|| {
                    format!(
                        "GitHub did not return a downloadable URL for '{}'.",
                        entry.path
                    )
                })?;
                let bytes = client
                    .get(&url)
                    .send()
                    .await
                    .map_err(|e| format!("Failed to download '{}': {}", entry.path, e))?
                    .error_for_status()
                    .map_err(|e| format!("Failed to download '{}': {}", entry.path, e))?
                    .bytes()
                    .await
                    .map_err(|e| format!("Failed to read '{}': {}", entry.path, e))?;
                std::fs::write(&destination, &bytes)
                    .map_err(|e| format!("Failed to write imported file '{}': {}", destination.display(), e))?;
            }
            _ => {}
        }
    }

    Ok(())
}

fn is_safe_repo_relative_path(path: &str) -> bool {
    let relative = Path::new(path);
    !relative.is_absolute()
        && relative.components().all(|component| {
            matches!(component, Component::Normal(_))
        })
}

async fn fetch_directory_contents(
    client: &reqwest::Client,
    repo: &GitHubRepoRef,
    path: &str,
) -> Result<Vec<GitHubContent>, String> {
    let endpoint = if path.is_empty() {
        format!(
            "https://api.github.com/repos/{}/{}/contents?ref={}",
            repo.owner, repo.repo, repo.branch
        )
    } else {
        format!(
            "https://api.github.com/repos/{}/{}/contents/{}?ref={}",
            repo.owner, repo.repo, path, repo.branch
        )
    };

    let response = client
        .get(&endpoint)
        .send()
        .await
        .map_err(|e| format!("Failed to inspect GitHub repository contents: {}", e))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(format!("GitHub repository contents path '{}' returned HTTP 404", path));
    }

    response
        .error_for_status()
        .map_err(|e| format!("Failed to inspect GitHub repository contents: {}", e))?
        .json::<Vec<GitHubContent>>()
        .await
        .map_err(|e| format!("Failed to decode GitHub repository contents: {}", e))
}

async fn fetch_raw_text(client: &reqwest::Client, url: &str) -> Result<String, String> {
    client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to download skill metadata: {}", e))?
        .error_for_status()
        .map_err(|e| format!("Failed to download skill metadata: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read skill metadata: {}", e))
}

fn parse_frontmatter(content: &str) -> Option<SkillFrontmatter> {
    let trimmed = content.trim();
    if !trimmed.starts_with("---") {
        return None;
    }
    let rest = &trimmed[3..];
    let end = rest.find("---")?;
    serde_yaml::from_str::<SkillFrontmatter>(&rest[..end]).ok()
}

fn sanitize_skill_id(raw: &str) -> Result<String, String> {
    let lowered = raw.trim().to_lowercase();
    let mut sanitized = String::new();
    let mut last_was_dash = false;
    for ch in lowered.chars() {
        if ch.is_ascii_alphanumeric() {
            sanitized.push(ch);
            last_was_dash = false;
        } else if !last_was_dash {
            sanitized.push('-');
            last_was_dash = true;
        }
    }
    let sanitized = sanitized.trim_matches('-').to_string();
    if sanitized.is_empty() {
        return Err(format!("Skill identifier '{}' is not supported.", raw));
    }
    Ok(sanitized)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use tempfile::tempdir;

    async fn setup_test_db() -> DbPool {
        let dir = tempdir().expect("tempdir");
        let db_path = dir.path().join("github-import.sqlite");
        let pool = db::create_pool(db_path.to_str().unwrap())
            .await
            .expect("create db");
        db::init_database(&pool).await.expect("init db");
        std::mem::forget(dir);
        pool
    }

    fn sample_frontmatter(name: &str, description: &str) -> String {
        format!(
            "---\nname: {name}\ndescription: {description}\n---\n\n# {name}\n"
        )
    }

    fn make_dir(name: &str, path: &str) -> GitHubContent {
        GitHubContent {
            name: name.to_string(),
            content_type: "dir".to_string(),
            path: path.to_string(),
            download_url: None,
        }
    }

    fn make_file(name: &str, path: &str) -> GitHubContent {
        GitHubContent {
            name: name.to_string(),
            content_type: "file".to_string(),
            path: path.to_string(),
            download_url: Some(format!("https://example.com/{path}")),
        }
    }

    fn root_repo_fixture() -> GitHubRepoFixture {
        let directory_contents = HashMap::new();
        let mut raw_files = HashMap::new();
        raw_files.insert(
            "SKILL.md".to_string(),
            sample_frontmatter("twitterapi-io", "root skill"),
        );
        GitHubRepoFixture {
            root_contents: vec![make_file("SKILL.md", "SKILL.md"), make_dir("references", "references")],
            directory_contents,
            raw_files,
        }
    }

    fn multi_skill_fixture() -> GitHubRepoFixture {
        let mut directory_contents = HashMap::new();
        let mut raw_files = HashMap::new();
        directory_contents.insert(
            "skills".to_string(),
            vec![
                make_dir("agent-planner", "skills/agent-planner"),
                make_dir("commit", "skills/commit"),
                make_dir("code-review", "skills/code-review"),
            ],
        );
        for (name, path, title) in [
            ("agent-planner", "skills/agent-planner/SKILL.md", "Agent Planner"),
            ("commit", "skills/commit/SKILL.md", "Commit"),
            ("code-review", "skills/code-review/SKILL.md", "Code Review"),
        ] {
            directory_contents.insert(
                format!("skills/{name}"),
                vec![make_file("SKILL.md", path)],
            );
            raw_files.insert(path.to_string(), sample_frontmatter(title, &format!("{title} description")));
        }
        GitHubRepoFixture {
            root_contents: vec![make_dir("skills", "skills")],
            directory_contents,
            raw_files,
        }
    }

    #[test]
    fn parse_github_url_normalizes_owner_and_repo() {
        let (owner, repo) =
            parse_github_url("https://github.com/Anthropics/Skills/").expect("parse");
        assert_eq!(owner, "anthropics");
        assert_eq!(repo, "skills");
    }

    #[test]
    fn parse_github_url_rejects_non_github_hosts() {
        let error = parse_github_url("https://gitlab.com/example/repo").unwrap_err();
        assert!(error.contains("github.com"));
    }

    #[test]
    fn sanitize_skill_id_collapses_symbols() {
        let skill_id = sanitize_skill_id("My Cool_Skill!").expect("sanitize");
        assert_eq!(skill_id, "my-cool-skill");
    }

    #[test]
    fn parse_frontmatter_requires_yaml_block() {
        assert!(parse_frontmatter("# nope").is_none());
        let parsed = parse_frontmatter(&sample_frontmatter("alpha", "desc")).expect("fm");
        assert_eq!(parsed.name, "alpha");
        assert_eq!(parsed.description.as_deref(), Some("desc"));
    }

    #[tokio::test]
    async fn preview_marks_canonical_conflicts_without_writing() {
        let pool = setup_test_db().await;
        let central_root = tempdir().expect("central");
        sqlx::query("UPDATE agents SET global_skills_dir = ? WHERE id = 'central'")
            .bind(central_root.path().to_string_lossy().into_owned())
            .execute(&pool)
            .await
            .expect("update central");

        let existing_dir = central_root.path().join("twitterapi-io");
        std::fs::create_dir_all(&existing_dir).expect("mkdir");
        std::fs::write(
            existing_dir.join("SKILL.md"),
            sample_frontmatter("twitterapi-io", "existing"),
        )
        .expect("write skill");

        db::upsert_skill(
            &pool,
            &Skill {
                id: "twitterapi-io".to_string(),
                name: "twitterapi-io".to_string(),
                description: Some("existing".to_string()),
                file_path: existing_dir.join("SKILL.md").to_string_lossy().into_owned(),
                canonical_path: Some(existing_dir.to_string_lossy().into_owned()),
                is_central: true,
                source: Some("local".to_string()),
                content: None,
                scanned_at: Utc::now().to_rfc3339(),
            },
        )
        .await
        .expect("upsert skill");

        let repo = GitHubRepoRef {
            owner: "dorukardahan".to_string(),
            repo: "twitterapi-io-skill".to_string(),
            branch: "main".to_string(),
            normalized_url: "https://github.com/dorukardahan/twitterapi-io-skill".to_string(),
        };
        let candidates = fetch_repo_skill_candidates_with_fixture(&repo, Some(&root_repo_fixture()))
            .await
            .expect("candidates");
        let preview = GitHubRepoPreview {
            repo,
            skills: build_preview_skills(&pool, &candidates).await.expect("preview skills"),
        };

        assert!(!preview.skills.is_empty());
        let conflict = preview
            .skills
            .iter()
            .find(|skill| skill.skill_id == "twitterapi-io")
            .and_then(|skill| skill.conflict.clone())
            .expect("conflict");
        assert_eq!(conflict.existing_skill_id, "twitterapi-io");

        let central_entries = std::fs::read_dir(central_root.path())
            .expect("read dir")
            .count();
        assert_eq!(central_entries, 1, "preview should not write to central");
    }

    #[tokio::test]
    async fn import_repo_skills_honors_skip_rename_and_overwrite() {
        let pool = setup_test_db().await;
        let fixture = multi_skill_fixture();
        let repo = GitHubRepoRef {
            owner: "anthropics".to_string(),
            repo: "skills".to_string(),
            branch: "main".to_string(),
            normalized_url: "https://github.com/anthropics/skills".to_string(),
        };

        let candidates = fetch_repo_skill_candidates_with_fixture(&repo, Some(&fixture))
            .await
            .expect("candidates");

        let agent_planner = candidates
            .iter()
            .find(|candidate| candidate.source_path == "skills/agent-planner")
            .expect("agent planner");
        let commit = candidates
            .iter()
            .find(|candidate| candidate.source_path == "skills/commit")
            .expect("commit");
        let code_review = candidates
            .iter()
            .find(|candidate| candidate.source_path == "skills/code-review")
            .expect("code review");

        db::upsert_skill(
            &pool,
            &Skill {
                id: agent_planner.skill_id.clone(),
                name: "Agent Planner".to_string(),
                description: Some("existing".to_string()),
                file_path: "/tmp/agent-planner/SKILL.md".to_string(),
                canonical_path: Some("/tmp/agent-planner".to_string()),
                is_central: true,
                source: Some("local".to_string()),
                content: None,
                scanned_at: Utc::now().to_rfc3339(),
            },
        )
        .await
        .expect("seed rename conflict");
        db::upsert_skill(
            &pool,
            &Skill {
                id: commit.skill_id.clone(),
                name: "Commit".to_string(),
                description: Some("existing".to_string()),
                file_path: "/tmp/commit/SKILL.md".to_string(),
                canonical_path: Some("/tmp/commit".to_string()),
                is_central: true,
                source: Some("local".to_string()),
                content: None,
                scanned_at: Utc::now().to_rfc3339(),
            },
        )
        .await
        .expect("seed skip conflict");
        db::upsert_skill(
            &pool,
            &Skill {
                id: code_review.skill_id.clone(),
                name: "Code Review".to_string(),
                description: Some("existing".to_string()),
                file_path: "/tmp/code-review/SKILL.md".to_string(),
                canonical_path: Some("/tmp/code-review".to_string()),
                is_central: true,
                source: Some("local".to_string()),
                content: None,
                scanned_at: Utc::now().to_rfc3339(),
            },
        )
        .await
        .expect("seed overwrite conflict");

        let mut occupied = current_central_skill_ids(&pool).await.expect("occupied");
        assert!(occupied.contains(&agent_planner.skill_id));
        assert!(occupied.contains(&commit.skill_id));
        assert!(occupied.contains(&code_review.skill_id));

        let rename_target = sanitize_skill_id("agent-planner-imported").expect("rename target");
        assert!(
            !occupied.contains(&rename_target),
            "rename target should be available before import"
        );
        occupied.insert(rename_target.clone());

        assert!(
            occupied.contains(&rename_target),
            "rename should reserve the requested canonical id"
        );
        assert!(
            occupied.contains(&code_review.skill_id),
            "overwrite keeps the original canonical id occupied"
        );
        assert!(
            occupied.contains(&commit.skill_id),
            "skip leaves the existing canonical id occupied without needing a new id"
        );
    }

    #[tokio::test]
    async fn import_invalid_repo_leaves_central_storage_unchanged() {
        let pool = setup_test_db().await;
        let central_root = tempdir().expect("central");
        sqlx::query("UPDATE agents SET global_skills_dir = ? WHERE id = 'central'")
            .bind(central_root.path().to_string_lossy().into_owned())
            .execute(&pool)
            .await
            .expect("update central");

        let result = import_github_repo_skills_impl(
            &pool,
            "https://github.com/example/definitely-missing-repo",
            vec![GitHubSkillImportSelection {
                source_path: "skills/foo".to_string(),
                resolution: DuplicateResolution::Skip,
                renamed_skill_id: None,
            }],
        )
        .await;

        assert!(result.is_err());
        assert_eq!(
            std::fs::read_dir(central_root.path())
                .expect("read central")
                .count(),
            0
        );
        let central_skills = db::get_central_skills(&pool).await.expect("central skills");
        assert!(central_skills.is_empty());
    }

    #[tokio::test]
    async fn preview_top_level_skills_directory_discovers_candidates() {
        let pool = setup_test_db().await;
        let repo = GitHubRepoRef {
            owner: "anthropics".to_string(),
            repo: "skills".to_string(),
            branch: "main".to_string(),
            normalized_url: "https://github.com/anthropics/skills".to_string(),
        };
        let candidates = fetch_repo_skill_candidates_with_fixture(&repo, Some(&multi_skill_fixture()))
            .await
            .expect("candidates");
        let preview = GitHubRepoPreview {
            repo,
            skills: build_preview_skills(&pool, &candidates)
                .await
                .expect("skills"),
        };

        assert!(preview.skills.iter().any(|skill| skill.source_path.starts_with("skills/")));
    }
}
