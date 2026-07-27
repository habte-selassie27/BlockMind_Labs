use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct KeyStore {
    keys: Arc<RwLock<HashMap<String, Vec<u8>>>>,
    cipher: Aes256Gcm,
}

impl KeyStore {
    pub fn new(encryption_key: &[u8; 32]) -> Self {
        let cipher = Aes256Gcm::new_from_slice(encryption_key)
            .expect("Failed to create cipher");

        Self {
            keys: Arc::new(RwLock::new(HashMap::new())),
            cipher,
        }
    }

    pub async fn store_key(&self, user_id_hash: &str, private_key: &[u8]) -> Result<(), String> {
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let encrypted = self.cipher
            .encrypt(nonce, private_key)
            .map_err(|e| format!("Encryption failed: {}", e))?;

        // Prepend nonce to encrypted key
        let mut stored = nonce_bytes.to_vec();
        stored.extend(encrypted);

        let mut keys = self.keys.write().await;
        keys.insert(user_id_hash.to_string(), stored);
        Ok(())
    }

    pub async fn get_key(&self, user_id_hash: &str) -> Result<Vec<u8>, String> {
        let keys = self.keys.read().await;
        let stored = keys.get(user_id_hash)
            .ok_or_else(|| "Key not found".to_string())?;

        if stored.len() < 12 {
            return Err("Invalid stored key".to_string());
        }

        let nonce = Nonce::from_slice(&stored[..12]);
        let encrypted = &stored[12..];

        self.cipher
            .decrypt(nonce, encrypted)
            .map_err(|e| format!("Decryption failed: {}", e))
    }

    pub async fn has_key(&self, user_id_hash: &str) -> bool {
        let keys = self.keys.read().await;
        keys.contains_key(user_id_hash)
    }

    pub async fn remove_key(&self, user_id_hash: &str) -> bool {
        let mut keys = self.keys.write().await;
        keys.remove(user_id_hash).is_some()
    }
}

pub fn hash_user_id(user_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(user_id.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_store_and_retrieve_key() {
        let key = [0u8; 32];
        let store = KeyStore::new(&key);

        let user_hash = hash_user_id("test_user");
        let private_key = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

        store.store_key(&user_hash, &private_key).await.unwrap();
        let retrieved = store.get_key(&user_hash).await.unwrap();
        assert_eq!(retrieved, private_key);
    }

    #[tokio::test]
    async fn test_key_not_found() {
        let key = [0u8; 32];
        let store = KeyStore::new(&key);
        let result = store.get_key("nonexistent").await;
        assert!(result.is_err());
    }

    #[test]
    fn test_hash_user_id() {
        let hash = hash_user_id("test");
        assert_eq!(hash.len(), 64); // SHA-256 hex length
    }
}
