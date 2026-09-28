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
    State(_state): State<Arc<AppState>>,
    Json(_req): Json<SignRequest>,
) -> Result<Json<SignResponse>, (StatusCode, Json<Value>)> {
    // Transaction signing is NOT implemented. This crate links no secp256k1
    // implementation (see Cargo.toml: axum, tokio, serde, sha2, aes-gcm, rand,
    // hex only), so it is structurally incapable of producing a signature.
    //
    // It previously returned a hardcoded "mock_signed_tx" alongside a random
    // hash, which callers surfaced to end users as a confirmed on-chain
    // transfer. See apps/agent-runtime/src/routes.ts, which fabricated a
    // matching hash on the way out. A fabricated success is more dangerous than
    // an honest failure, so this endpoint now refuses.
    //
    // Failing here, before any key material is decrypted, is deliberate.
    Err((
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "error": "signing_not_implemented",
            "message": "This signer cannot sign transactions: no secp256k1 implementation is linked. No signature was produced, no private key was decrypted, and no transaction was submitted.",
            "signed": false,
        })),
    ))
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
