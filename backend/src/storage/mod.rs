mod local;
pub use local::LocalStorage;

use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Clone)]
pub enum StorageBackend {
    Local(LocalStorage),
}

impl StorageBackend {
    pub fn local(base_path: PathBuf) -> Self {
        StorageBackend::Local(LocalStorage::new(base_path))
    }

    pub async fn init(&self) -> Result<(), StorageError> {
        match self {
            StorageBackend::Local(s) => s.init().await,
        }
    }

    pub async fn load(&self, drawing_id: Uuid) -> Result<Option<Vec<u8>>, StorageError> {
        match self {
            StorageBackend::Local(s) => s.load(drawing_id).await,
        }
    }

    pub async fn save(&self, drawing_id: Uuid, content: &[u8]) -> Result<(), StorageError> {
        match self {
            StorageBackend::Local(s) => s.save(drawing_id, content).await,
        }
    }

    pub async fn delete(&self, drawing_id: Uuid) -> Result<(), StorageError> {
        match self {
            StorageBackend::Local(s) => s.delete(drawing_id).await,
        }
    }

    pub async fn load_thumbnail(&self, drawing_id: Uuid) -> Result<Option<Vec<u8>>, StorageError> {
        match self {
            StorageBackend::Local(s) => s.load_thumbnail(drawing_id).await,
        }
    }

    pub async fn save_thumbnail(&self, drawing_id: Uuid, data: &[u8]) -> Result<(), StorageError> {
        match self {
            StorageBackend::Local(s) => s.save_thumbnail(drawing_id, data).await,
        }
    }

    pub async fn delete_thumbnail(&self, drawing_id: Uuid) -> Result<(), StorageError> {
        match self {
            StorageBackend::Local(s) => s.delete_thumbnail(drawing_id).await,
        }
    }
}