// Test for tilde expansion in custom agent paths

#[cfg(test)]
mod tilde_expansion_tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_expand_tilde_with_home_prefix() {
        let path = "~/.custom-agent/skills/";
        let expanded = expand_tilde(path);
        
        // Should not start with literal "~"
        assert!(!expanded.to_string_lossy().starts_with("~"));
        
        // Should be an absolute path
        assert!(expanded.is_absolute());
        
        // Should end with the relative part
        assert!(expanded.to_string_lossy().ends_with(".custom-agent/skills/"));
    }

    #[test]
    fn test_expand_tilde_with_absolute_path() {
        let path = "/absolute/path/to/skills";
        let expanded = expand_tilde(path);
        
        // Should remain unchanged
        assert_eq!(expanded, PathBuf::from(path));
    }

    #[test]
    fn test_expand_tilde_with_relative_path() {
        let path = "relative/path";
        let expanded = expand_tilde(path);
        
        // Should remain unchanged
        assert_eq!(expanded, PathBuf::from(path));
    }

    #[test]
    fn test_expand_tilde_without_slash() {
        let path = "~";
        let expanded = expand_tilde(path);
        
        // Should remain as "~" since it doesn't start with "~/"
        assert_eq!(expanded, PathBuf::from("~"));
    }
}
