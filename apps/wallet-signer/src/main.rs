use axum::Router;
use std::sync::Arc;

mod handlers;
mod keystore;
mod models;

use handlers::{AppState, create_router};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Generate or load encryption key (32 bytes for AES-256)
    // In production: load from KMS/HSM
    let encryption_key = [0u8; 32]; // Dev only — use proper key in prod!

    let state = Arc::new(AppState {
        key_store: keystore::KeyStore::new(&encryption_key),
        audit_log: tokio::sync::RwLock::new(Vec::new()),
    });

    let app = create_router(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8004")
        .await
        .unwrap();

    tracing::info!("wallet-signer listening on :8004");
    axum::serve(listener, app).await.unwrap();
}
