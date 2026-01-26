use std::sync::Arc;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime, Manager};
use hyper::{Body, Request, Response, Server, StatusCode};
use hyper::service::{make_service_fn, service_fn};
use crate::core;
use crate::core::state::AppState;
use crate::core::app::models::AppConfiguration;
use crate::core::downloads::models::DownloadItem;
use serde_json::{Value, Map};

pub async fn start_app_server<R: Runtime>(app_handle: AppHandle<R>) {
    // Port 0 binds to a random available port
    let addr = ([127, 0, 0, 1], 0).into();
    let app_handle = Arc::new(app_handle);

    let make_svc = make_service_fn(move |_conn| {
        let app_handle = app_handle.clone();
        async move {
            Ok::<_, hyper::Error>(service_fn(move |req| {
                handle_request(req, app_handle.clone())
            }))
        }
    });

    let server = Server::bind(&addr).serve(make_svc);
    let actual_addr = server.local_addr();
    // Print the port in a format the Electron main process can parse
    println!("JAN_SERVER_PORT={}", actual_addr.port());

    if let Err(e) = server.await {
        eprintln!("server error: {}", e);
    }
}

async fn handle_request<R: Runtime>(req: Request<Body>, app_handle: Arc<AppHandle<R>>) -> Result<Response<Body>, hyper::Error> {
    let path = req.uri().path().to_string();

    // CORS headers
    let response_builder = Response::builder()
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type");

    if req.method() == hyper::Method::OPTIONS {
        return Ok(response_builder.status(StatusCode::OK).body(Body::empty()).unwrap());
    }

    if !path.starts_with("/api/") {
        return Ok(response_builder.status(StatusCode::NOT_FOUND).body(Body::from("Not Found")).unwrap());
    }

    let command = &path[5..]; // strip /api/
    let body_bytes = hyper::body::to_bytes(req.into_body()).await?;
    let args: Value = serde_json::from_slice(&body_bytes).unwrap_or(Value::Object(serde_json::Map::new()));

    let result = dispatch_command(command, args, &app_handle).await;

    match result {
        Ok(val) => {
            let json = serde_json::to_string(&val).unwrap_or_default();
            Ok(response_builder.status(StatusCode::OK).body(Body::from(json)).unwrap())
        },
        Err(err) => {
             Ok(response_builder.status(StatusCode::INTERNAL_SERVER_ERROR).body(Body::from(err)).unwrap())
        }
    }
}

// Helper to extract argument
fn get_arg(args: &Value, key: &str) -> Result<Value, String> {
    args.get(key).cloned().ok_or_else(|| format!("Missing argument: {}", key))
}

fn get_string_arg(args: &Value, key: &str) -> Result<String, String> {
    get_arg(args, key)?.as_str().map(|s| s.to_string()).ok_or_else(|| format!("Argument {} must be a string", key))
}

async fn dispatch_command<R: Runtime>(command: &str, args: Value, app_handle: &AppHandle<R>) -> Result<Value, String> {
    match command {
        // App config
        "get_app_configurations" => {
            let res = core::app::commands::get_app_configurations(app_handle.clone());
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "get_user_home_path" => {
             let res = core::app::commands::get_user_home_path(app_handle.clone());
             Ok(Value::String(res))
        },
        "update_app_configuration" => {
            let config_val = get_arg(&args, "configuration")?;
            let config: AppConfiguration = serde_json::from_value(config_val).map_err(|e| e.to_string())?;
            core::app::commands::update_app_configuration(app_handle.clone(), config)?;
            Ok(Value::Null)
        },
        "get_jan_data_folder_path" => {
            let res = core::app::commands::get_jan_data_folder_path(app_handle.clone());
            Ok(Value::String(res.to_string_lossy().into_owned()))
        },

        // Threads
        "list_threads" => {
            let res = core::threads::commands::list_threads(app_handle.clone()).await?;
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "create_thread" => {
            let thread = get_arg(&args, "thread")?;
            let res = core::threads::commands::create_thread(app_handle.clone(), thread).await?;
            Ok(res)
        },
        "modify_thread" => {
            let thread = get_arg(&args, "thread")?;
            core::threads::commands::modify_thread(app_handle.clone(), thread).await?;
            Ok(Value::Null)
        },
        "delete_thread" => {
            let thread_id = get_string_arg(&args, "thread_id")?;
            core::threads::commands::delete_thread(app_handle.clone(), thread_id).await?;
            Ok(Value::Null)
        },
        "list_messages" => {
            let thread_id = get_string_arg(&args, "thread_id")?;
            let res = core::threads::commands::list_messages(app_handle.clone(), thread_id).await?;
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "create_message" => {
            let message = get_arg(&args, "message")?;
            let res = core::threads::commands::create_message(app_handle.clone(), message).await?;
            Ok(res)
        },
        "modify_message" => {
             let message = get_arg(&args, "message")?;
             let res = core::threads::commands::modify_message(app_handle.clone(), message).await?;
             Ok(res)
        },
        "delete_message" => {
            let thread_id = get_string_arg(&args, "thread_id")?;
            let message_id = get_string_arg(&args, "message_id")?;
            core::threads::commands::delete_message(app_handle.clone(), thread_id, message_id).await?;
            Ok(Value::Null)
        },

        // Server
        "start_server" => {
             let config: core::server::commands::StartServerConfig = serde_json::from_value(get_arg(&args, "config")?).map_err(|e| e.to_string())?;
             let state = app_handle.state::<AppState>();
             let port = core::server::commands::start_server(app_handle.clone(), state, config).await?;
             Ok(Value::Number(port.into()))
        },
        "stop_server" => {
            let state = app_handle.state::<AppState>();
            core::server::commands::stop_server(state).await?;
            Ok(Value::Null)
        },
        "get_server_status" => {
             let state = app_handle.state::<AppState>();
             let running = core::server::commands::get_server_status(state).await?;
             Ok(Value::Bool(running))
        },

        // System
        "read_logs" => {
             let res = core::system::commands::read_logs(app_handle.clone()).await?;
             Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "factory_reset" => {
            let state = app_handle.state::<AppState>();
            core::system::commands::factory_reset(app_handle.clone(), state);
            Ok(Value::Null)
        },

        // Filesystem
        "file_stat" => {
            let path = get_string_arg(&args, "path")?;
            let res = core::filesystem::commands::file_stat(app_handle.clone(), path);
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "read_file_sync" => {
            let path = get_string_arg(&args, "path")?;
            let res = core::filesystem::commands::read_file_sync(app_handle.clone(), vec![path]);
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "exists_sync" => {
            let path = get_string_arg(&args, "path")?;
            let res = core::filesystem::commands::exists_sync(app_handle.clone(), vec![path]);
            Ok(Value::Bool(res?))
        },
        "mkdir" => {
            let path = get_string_arg(&args, "path")?;
            // args: Vec<String>
            let res = core::filesystem::commands::mkdir(app_handle.clone(), vec![path]);
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "write_file_sync" => {
            let path = get_string_arg(&args, "path")?;
            let content = get_string_arg(&args, "content")?;
            let res = core::filesystem::commands::write_file_sync(app_handle.clone(), vec![path, content]);
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "read_yaml" => {
            let path = get_string_arg(&args, "path")?;
            let res = core::filesystem::commands::read_yaml(app_handle.clone(), &path);
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "write_yaml" => {
            let path = get_string_arg(&args, "path")?;
            let content = get_arg(&args, "content")?;
            let res = core::filesystem::commands::write_yaml(app_handle.clone(), content, &path);
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "join_path" => {
            let paths_val = get_arg(&args, "paths")?;
            let paths: Vec<String> = serde_json::from_value(paths_val).map_err(|e| e.to_string())?;
            let res = core::filesystem::commands::join_path(app_handle.clone(), paths);
            Ok(Value::String(res?))
        },

        // Extensions
        "get_jan_extensions_path" => {
            let res = core::extensions::commands::get_jan_extensions_path(app_handle.clone());
            Ok(Value::String(res.to_string_lossy().into_owned()))
        },
        "install_extensions" => {
            core::extensions::commands::install_extensions(app_handle.clone());
            Ok(Value::Null)
        },
        "get_active_extensions" => {
            let res = core::extensions::commands::get_active_extensions(app_handle.clone());
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },

        // Downloads
        "download_files" => {
            let items_val = get_arg(&args, "items")?;
            let items: Vec<DownloadItem> = serde_json::from_value(items_val).map_err(|e| e.to_string())?;
            let task_id = get_string_arg(&args, "task_id")?;
            let headers_val = args.get("headers").cloned().unwrap_or(Value::Object(Map::new()));
            let headers: HashMap<String, String> = serde_json::from_value(headers_val).map_err(|e| e.to_string())?;

            let state = app_handle.state::<AppState>();
            core::downloads::commands::download_files(app_handle.clone(), state, items, &task_id, headers).await?;
            Ok(Value::Null)
        },
        "cancel_download_task" => {
            let download_id = get_string_arg(&args, "download_id")?;
            let state = app_handle.state::<AppState>();
            core::downloads::commands::cancel_download_task(state, &download_id).await?;
            Ok(Value::Null)
        },

        // MCP
        "get_tools" => {
            let state = app_handle.state::<AppState>();
            let res = core::mcp::commands::get_tools(state).await?;
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "call_tool" => {
            let tool_name = get_string_arg(&args, "tool_name")?;
            let server_name = args.get("server_name").and_then(|v| v.as_str()).map(|s| s.to_string());
            let arguments = args.get("arguments").and_then(|v| v.as_object()).cloned();

            let state = app_handle.state::<AppState>();
            let res = core::mcp::commands::call_tool(state, tool_name, server_name, arguments, None).await?;
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },
        "save_mcp_configs" => {
            let configs_val = get_arg(&args, "configs")?;
            // Expect string or object? Function expects String.
            let configs = if configs_val.is_string() {
                configs_val.as_str().unwrap().to_string()
            } else {
                serde_json::to_string(&configs_val).map_err(|e| e.to_string())?
            };
            core::mcp::commands::save_mcp_configs(app_handle.clone(), configs).await?;
            Ok(Value::Null)
        },
        "get_mcp_configs" => {
            let res = core::mcp::commands::get_mcp_configs(app_handle.clone()).await?;
            Ok(Value::String(res))
        },
        "restart_mcp_servers" => {
            let state = app_handle.state::<AppState>();
            core::mcp::commands::restart_mcp_servers(app_handle.clone(), state).await?;
            Ok(Value::Null)
        },
        "get_connected_servers" => {
            let state = app_handle.state::<AppState>();
            let res = core::mcp::commands::get_connected_servers(app_handle.clone(), state).await?;
            Ok(serde_json::to_value(res).map_err(|e| e.to_string())?)
        },

        _ => Err(format!("Unknown command: {}", command))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_get_arg_valid() {
        let args = json!({
            "key": "value",
            "number": 123
        });
        let val = get_arg(&args, "key").unwrap();
        assert_eq!(val, "value");
    }

    #[test]
    fn test_get_arg_missing() {
        let args = json!({
            "key": "value"
        });
        let result = get_arg(&args, "missing");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Missing argument: missing");
    }

    #[test]
    fn test_get_string_arg_valid() {
        let args = json!({
            "key": "value"
        });
        let val = get_string_arg(&args, "key").unwrap();
        assert_eq!(val, "value");
    }

    #[test]
    fn test_get_string_arg_invalid_type() {
        let args = json!({
            "key": 123
        });
        let result = get_string_arg(&args, "key");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Argument key must be a string");
    }
}
