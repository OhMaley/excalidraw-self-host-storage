use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

use super::StorageError;

#[derive(Clone)]
pub struct LocalStorage {
    base_path: PathBuf,
}

impl LocalStorage {
    pub fn new(base_path: PathBuf) -> Self {
        Self { base_path }
    }

    pub async fn init(&self) -> Result<(), StorageError> {
        fs::create_dir_all(&self.base_path).await.map_err(StorageError::Io)
    }

    fn path_for(&self, drawing_id: Uuid) -> PathBuf {
        self.base_path.join(format!("{drawing_id}.excalidraw"))
    }

    fn thumbnail_path_for(&self, drawing_id: Uuid) -> PathBuf {
        self.base_path.join(format!("{drawing_id}.thumbnail.png"))
    }

    pub async fn load(&self, drawing_id: Uuid) -> Result<Option<Vec<u8>>, StorageError> {
        match fs::read(self.path_for(drawing_id)).await {
            Ok(bytes) => Ok(Some(bytes)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(StorageError::Io(e)),
        }
    }

    pub async fn save(&self, drawing_id: Uuid, content: &[u8]) -> Result<(), StorageError> {
        fs::write(self.path_for(drawing_id), content)
            .await
            .map_err(StorageError::Io)
    }

    pub async fn delete(&self, drawing_id: Uuid) -> Result<(), StorageError> {
        match fs::remove_file(self.path_for(drawing_id)).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(StorageError::Io(e)),
        }
    }

    pub async fn load_thumbnail(&self, drawing_id: Uuid) -> Result<Option<Vec<u8>>, StorageError> {
        match fs::read(self.thumbnail_path_for(drawing_id)).await {
            Ok(bytes) => Ok(Some(bytes)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(StorageError::Io(e)),
        }
    }

    pub async fn save_thumbnail(&self, drawing_id: Uuid, data: &[u8]) -> Result<(), StorageError> {
        fs::write(self.thumbnail_path_for(drawing_id), data)
            .await
            .map_err(StorageError::Io)
    }

    pub async fn delete_thumbnail(&self, drawing_id: Uuid) -> Result<(), StorageError> {
        match fs::remove_file(self.thumbnail_path_for(drawing_id)).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(StorageError::Io(e)),
        }
    }
}