use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillRegistry {
    pub id: String,
    pub name: String,
    pub source_type: String,
    pub url: String,
    pub is_builtin: bool,
    pub is_enabled: bool,
    pub last_synced: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MarketplaceSkill {
    pub id: String,
    pub registry_id: String,
    pub name: String,
    pub description: Option<String>,
    pub download_url: String,
    pub is_installed: bool,
    pub synced_at: String,
}

// ─── GitHub API types ────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct GitHubContent {
    name: String,
    #[serde(rename = "type")]
    content_type: String,
    path: String,
    download_url: Option<String>,
}

#[derive(Deserialize)]
struct SkillFrontmatter {
    name: String,
    description: Option<String>,
}

// ─── Registry Fetcher ────────────────────────────────────────────────────────

/// Parse a GitHub URL like "https://github.com/owner/repo" into (owner, repo).
fn parse_github_url(url: &str) -> Result<(String, String), String> {
    let url = url.trim_end_matches('/');
    let parts: Vec<&str> = url.split('/').collect();
    if parts.len() < 2 {
        return Err("Invalid GitHub URL".to_string());
    }
    let owner = parts[parts.len() - 2].to_string();
    let repo = parts[parts.len() - 1].to_string();
    Ok((owner, repo))
}

/// Fetch skills from a GitHub repository.
/// Scans the repo root for skill directories. If a `skills/` subdirectory
/// exists, also scans inside it. This handles both layouts:
///   - repo-root/skill-name/SKILL.md
///   - repo-root/skills/skill-name/SKILL.md
async fn fetch_github_skills(
    url: &str,
    registry_id: &str,
) -> Result<Vec<MarketplaceSkill>, String> {
    let (owner, repo) = parse_github_url(url)?;
    let client = reqwest::Client::builder()
        .user_agent("skills-manage/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let mut skills = Vec::new();

    // Paths to scan: root + common skill subdirectories
    let scan_paths = vec!["", "skills"];

    for base_path in &scan_paths {
        let api_url = if base_path.is_empty() {
            format!("https://api.github.com/repos/{}/{}/contents/", owner, repo)
        } else {
            format!(
                "https://api.github.com/repos/{}/{}/contents/{}",
                owner, repo, base_path
            )
        };

        let resp = match client.get(&api_url).send().await {
            Ok(r) if r.status().is_success() => r,
            _ => continue, // path doesn't exist, skip
        };

        let contents: Vec<GitHubContent> = match resp.json().await {
            Ok(c) => c,
            Err(_) => continue,
        };

        // Filter directories (skip "skills" dir itself to avoid double-scanning)
        let dirs: Vec<&GitHubContent> = contents
            .iter()
            .filter(|c| c.content_type == "dir" && c.name != "skills")
            .collect();

        for dir in dirs {
            let dir_api = format!(
                "https://api.github.com/repos/{}/{}/contents/{}",
                owner, repo, dir.path
            );
            let dir_resp = match client.get(&dir_api).send().await {
                Ok(r) if r.status().is_success() => r,
                _ => continue,
            };

            let dir_contents: Vec<GitHubContent> = match dir_resp.json().await {
                Ok(c) => c,
                Err(_) => continue,
            };

            let skill_md = dir_contents
                .iter()
                .find(|c| c.name == "SKILL.md" && c.content_type == "file");

            if let Some(skill_file) = skill_md {
                let download_url = skill_file.download_url.clone().unwrap_or_else(|| {
                    format!(
                        "https://raw.githubusercontent.com/{}/{}/main/{}/SKILL.md",
                        owner, repo, dir.path
                    )
                });

                let (name, description) =
                    fetch_skill_metadata(&client, &download_url, &dir.name).await;

                // Deduplicate by skill name
                if !skills.iter().any(|s: &MarketplaceSkill| s.name == name) {
                    skills.push(MarketplaceSkill {
                        id: format!("{}::{}", registry_id, dir.name),
                        registry_id: registry_id.to_string(),
                        name,
                        description,
                        download_url,
                        is_installed: false,
                        synced_at: now.clone(),
                    });
                }
            }
        }
    }

    Ok(skills)
}

/// Fetch SKILL.md content and parse YAML frontmatter for name and description.
async fn fetch_skill_metadata(
    client: &reqwest::Client,
    url: &str,
    fallback_name: &str,
) -> (String, Option<String>) {
    let resp = client.get(url).send().await;
    if let Ok(resp) = resp {
        if let Ok(text) = resp.text().await {
            if let Some((name, desc)) = parse_frontmatter(&text) {
                return (name, desc);
            }
        }
    }
    (fallback_name.to_string(), None)
}

/// Parse YAML frontmatter from SKILL.md content.
fn parse_frontmatter(content: &str) -> Option<(String, Option<String>)> {
    let content = content.trim();
    if !content.starts_with("---") {
        return None;
    }
    let rest = &content[3..];
    let end = rest.find("---")?;
    let yaml_str = &rest[..end];
    let fm: SkillFrontmatter = serde_yaml::from_str(yaml_str).ok()?;
    Some((fm.name, fm.description))
}

// ─── IPC Commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_registries(state: State<'_, AppState>) -> Result<Vec<SkillRegistry>, String> {
    let rows = sqlx::query(
        "SELECT id, name, source_type, url, is_builtin, is_enabled, last_synced, created_at
         FROM skill_registries ORDER BY is_builtin DESC, name",
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| {
            use sqlx::Row;
            SkillRegistry {
                id: r.get("id"),
                name: r.get("name"),
                source_type: r.get("source_type"),
                url: r.get("url"),
                is_builtin: r.get("is_builtin"),
                is_enabled: r.get("is_enabled"),
                last_synced: r.get("last_synced"),
                created_at: r.get("created_at"),
            }
        })
        .collect())
}

#[tauri::command]
pub async fn add_registry(
    state: State<'_, AppState>,
    name: String,
    source_type: String,
    url: String,
) -> Result<SkillRegistry, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO skill_registries (id, name, source_type, url, is_builtin, is_enabled, created_at)
         VALUES (?, ?, ?, ?, 0, 1, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&source_type)
    .bind(&url)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(SkillRegistry {
        id,
        name,
        source_type,
        url,
        is_builtin: false,
        is_enabled: true,
        last_synced: None,
        created_at: now,
    })
}

#[tauri::command]
pub async fn remove_registry(
    state: State<'_, AppState>,
    registry_id: String,
) -> Result<(), String> {
    // Don't allow removing built-in registries
    let row = sqlx::query("SELECT is_builtin FROM skill_registries WHERE id = ?")
        .bind(&registry_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(r) = &row {
        use sqlx::Row;
        if r.get::<bool, _>("is_builtin") {
            return Err("Cannot remove built-in registry".to_string());
        }
    }

    // Delete cached skills first
    sqlx::query("DELETE FROM marketplace_skills WHERE registry_id = ?")
        .bind(&registry_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM skill_registries WHERE id = ?")
        .bind(&registry_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn sync_registry(
    state: State<'_, AppState>,
    registry_id: String,
) -> Result<Vec<MarketplaceSkill>, String> {
    // Get registry info
    let row = sqlx::query(
        "SELECT id, name, source_type, url, is_builtin, is_enabled, last_synced, created_at
         FROM skill_registries WHERE id = ?",
    )
    .bind(&registry_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Registry not found".to_string())?;

    let registry = {
        use sqlx::Row;
        SkillRegistry {
            id: row.get("id"),
            name: row.get("name"),
            source_type: row.get("source_type"),
            url: row.get("url"),
            is_builtin: row.get("is_builtin"),
            is_enabled: row.get("is_enabled"),
            last_synced: row.get("last_synced"),
            created_at: row.get("created_at"),
        }
    };

    // Fetch skills based on source type
    let skills = match registry.source_type.as_str() {
        "github" => fetch_github_skills(&registry.url, &registry.id).await?,
        _ => return Err(format!("Unsupported source type: {}", registry.source_type)),
    };

    // Check which skills are already installed locally
    let central_dir = {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        format!("{}/.agents/skills", home)
    };

    // Upsert skills into marketplace_skills
    for skill in &skills {
        let is_installed =
            std::path::Path::new(&central_dir).join(&skill.name).join("SKILL.md").exists();

        sqlx::query(
            "INSERT INTO marketplace_skills (id, registry_id, name, description, download_url, is_installed, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                download_url = excluded.download_url,
                is_installed = excluded.is_installed,
                synced_at = excluded.synced_at",
        )
        .bind(&skill.id)
        .bind(&skill.registry_id)
        .bind(&skill.name)
        .bind(&skill.description)
        .bind(&skill.download_url)
        .bind(is_installed)
        .bind(&skill.synced_at)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Update last_synced
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("UPDATE skill_registries SET last_synced = ? WHERE id = ?")
        .bind(&now)
        .bind(&registry_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    // Return the updated list
    search_marketplace_skills_impl(&state.db, Some(registry_id), None).await
}

#[tauri::command]
pub async fn search_marketplace_skills(
    state: State<'_, AppState>,
    registry_id: Option<String>,
    query: Option<String>,
) -> Result<Vec<MarketplaceSkill>, String> {
    search_marketplace_skills_impl(&state.db, registry_id, query).await
}

async fn search_marketplace_skills_impl(
    pool: &crate::db::DbPool,
    registry_id: Option<String>,
    query: Option<String>,
) -> Result<Vec<MarketplaceSkill>, String> {
    let mut sql = String::from(
        r#"SELECT id, registry_id, name, description, download_url,
            is_installed AS "is_installed: bool", synced_at
         FROM marketplace_skills WHERE 1=1"#,
    );
    let mut bindings: Vec<String> = Vec::new();

    if let Some(ref rid) = registry_id {
        sql.push_str(" AND registry_id = ?");
        bindings.push(rid.clone());
    }
    if let Some(ref q) = query {
        if !q.trim().is_empty() {
            sql.push_str(" AND (name LIKE ? OR description LIKE ?)");
            let pattern = format!("%{}%", q);
            bindings.push(pattern.clone());
            bindings.push(pattern);
        }
    }
    sql.push_str(" ORDER BY name");

    let mut q = sqlx::query_as::<_, MarketplaceSkillRow>(&sql);
    for b in &bindings {
        q = q.bind(b);
    }

    let rows = q.fetch_all(pool).await.map_err(|e| e.to_string())?;
    Ok(rows
        .into_iter()
        .map(|r| MarketplaceSkill {
            id: r.id,
            registry_id: r.registry_id,
            name: r.name,
            description: r.description,
            download_url: r.download_url,
            is_installed: r.is_installed,
            synced_at: r.synced_at,
        })
        .collect())
}

#[derive(sqlx::FromRow)]
struct MarketplaceSkillRow {
    id: String,
    registry_id: String,
    name: String,
    description: Option<String>,
    download_url: String,
    is_installed: bool,
    synced_at: String,
}

#[tauri::command]
pub async fn install_marketplace_skill(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<(), String> {
    // Get skill info
    let skill = sqlx::query_as::<_, MarketplaceSkillRow>(
        "SELECT id, registry_id, name, description, download_url, is_installed, synced_at
         FROM marketplace_skills WHERE id = ?",
    )
    .bind(&skill_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Skill not found".to_string())?;

    // Download SKILL.md content
    let client = reqwest::Client::builder()
        .user_agent("skills-manage/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&skill.download_url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Download returned {}", resp.status()));
    }

    let content = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Create directory and write SKILL.md
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let skill_dir = std::path::PathBuf::from(format!(
        "{}/.agents/skills/{}",
        home, skill.name
    ));
    std::fs::create_dir_all(&skill_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let skill_md_path = skill_dir.join("SKILL.md");
    std::fs::write(&skill_md_path, &content)
        .map_err(|e| format!("Failed to write SKILL.md: {}", e))?;

    // Mark as installed in DB
    sqlx::query("UPDATE marketplace_skills SET is_installed = 1 WHERE id = ?")
        .bind(&skill_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ─── AI Explanation ──────────────────────────────────────────────────────────

#[derive(Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<ClaudeMessage>,
}

#[derive(Serialize)]
struct ClaudeMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContentBlock>,
}

#[derive(Deserialize)]
struct ClaudeContentBlock {
    #[serde(rename = "type", default)]
    block_type: String,
    #[serde(default)]
    text: String,
}

#[tauri::command]
pub async fn explain_skill(
    state: State<'_, AppState>,
    content: String,
) -> Result<String, String> {
    // Read dynamic provider settings
    async fn get_setting(pool: &crate::db::DbPool, key: &str) -> Option<String> {
        sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten()
            .filter(|v| !v.trim().is_empty())
    }

    let api_key = get_setting(&state.db, "ai_api_key")
        .await
        .ok_or_else(|| "请先在设置中配置 AI API Key".to_string())?;

    let api_url = get_setting(&state.db, "ai_api_url")
        .await
        .unwrap_or_else(|| "https://api.anthropic.com/v1/messages".to_string());

    let model = get_setting(&state.db, "ai_model")
        .await
        .unwrap_or_else(|| "claude-sonnet-4-20250514".to_string());

    let client = reqwest::Client::builder()
        .user_agent("skills-manage/0.1.0")
        .build()
        .map_err(|e| e.to_string())?;

    // Truncate content if too long
    let truncated = if content.len() > 8000 {
        format!("{}...\n\n(内容已截断)", &content[..8000])
    } else {
        content
    };

    let request = ClaudeRequest {
        model,
        max_tokens: 1024,
        messages: vec![ClaudeMessage {
            role: "user".to_string(),
            content: format!(
                "请用中文简洁地解释以下 AI Agent Skill（SKILL.md）的用途、使用场景和关键功能。\
                分为三部分：1) 一句话总结 2) 适用场景 3) 关键功能点。\
                控制在 200 字以内。\n\n---\n\n{}",
                truncated
            ),
        }],
    };

    let resp = client
        .post(&api_url)
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("API 请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("API 返回错误 {}: {}", status, body));
    }

    let body = resp
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    // Try parsing as Anthropic format: { "content": [{ "type": "text", "text": "..." }] }
    if let Ok(claude_resp) = serde_json::from_str::<ClaudeResponse>(&body) {
        // Filter for "text" type blocks, skip "thinking" blocks
        if let Some(block) = claude_resp
            .content
            .iter()
            .find(|b| b.block_type.is_empty() || b.block_type == "text")
        {
            if !block.text.is_empty() {
                return Ok(block.text.clone());
            }
        }
    }

    // Fallback: try extracting text from any JSON with a "text" or "content" field
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&body) {
        // Some providers return { "choices": [{ "message": { "content": "..." } }] }
        if let Some(text) = val
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
        {
            return Ok(text.to_string());
        }
    }

    Err(format!("无法解析响应: {}", &body[..body.len().min(500)]))
}
