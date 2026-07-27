use axum::{
    extract::State,
    http::StatusCode,
    Json, Router,
};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::keystore::{KeyStore, hash_user_id};
use crate::models::{SignRequest, SignResponse, AuditRecord, HealthResponse};

pub struct AppState {
    pub key_store: KeyStore,
    pub audit_log: RwLock<Vec<AuditRecord>>,
}

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", axum::routing::get(health))
        .route("/sign", axum::routing::post(sign))
        .route("/keys", axum::routing::post(store_key))
        .route("/keys/:user_id_hash", axum::routing::get(has_key))
        .with_state(state)
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "wallet-signer".to_string(),
    })
}

async fn sign(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SignRequest>,
) -> Result<Json<SignResponse>, (StatusCode, Json<Value>)> {
    // Validate user_id_hash matches
    let computed_hash = hash_user_id(&req.user_id_hash);
    if computed_hash != req.user_id_hash {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid user_id_hash" })),
        ));
    }

    // Check if key exists
    if !state.key_store.has_key(&req.user_id_hash).await {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "No key found for this user" })),
        ));
    }

    // Get the private key ( decrypted in memory only, never logged)
    let _private_key = state.key_store.get_key(&req.user_id_hash).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e }))))?;

    // In production: sign the transaction with the private key
    // For now, return a mock signed transaction
    let tx_hash = format!("0x{:064x}", rand::random::<u64>());
    let nonce = req.tx_request.nonce.unwrap_or(0);

    let response = SignResponse {
        signed_tx: format!("0x{}", hex::encode(b"mock_signed_tx")),
        tx_hash: tx_hash.clone(),
        nonce_used: nonce,
    };

    // Audit log (no key material!)
    let audit = AuditRecord {
        user_id_hash: req.user_id_hash,
        chain_id: req.tx_request.chain_id,
        tx_hash,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    };

    state.audit_log.write().await.push(audit);

    Ok(Json(response))
}

async fn store_key(
    State(state): State<Arc<AppState>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let user_id = req.get("user_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| (StatusCode::BAD_REQUEST, Json(json!({ "error": "user_id required" }))))?;

    let private_key_hex = req.get("private_key")
        .and_then(|v| v.as_str())
        .ok_or_else(|| (StatusCode::BAD_REQUEST, Json(json!({ "error": "private_key required" }))))?;

    let private_key = hex::decode(private_key_hex)
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(json!({ "error": format!("Invalid hex: {}", e) }))))?;

    let user_hash = hash_user_id(user_id);
    state.key_store.store_key(&user_hash, &private_key).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e }))))?;

    Ok(Json(json!({ "stored": true, "user_id_hash": user_hash })))
}

async fn has_key(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(user_id_hash): axum::extract::Path<String>,
) -> Json<Value> {
    let exists = state.key_store.has_key(&user_id_hash).await;
    Json(json!({ "exists": exists }))
}
