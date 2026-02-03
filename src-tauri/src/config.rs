use crate::subscriptions::Node;
use serde::{Deserialize, Serialize};

// ==========================================================
// Sing-box Config
// ==========================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct SingBoxConfig {
    pub log: LogConfig,
    pub inbounds: Vec<Inbound>,
    pub outbounds: Vec<Outbound>,
    pub route: RouteConfig,
    pub dns: DnsConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogConfig {
    pub level: String,
    pub output: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Inbound {
    #[serde(rename = "type")]
    pub inbound_type: String,
    pub tag: String,
    pub listen: String,
    pub listen_port: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Outbound {
    #[serde(rename = "type")]
    pub outbound_type: String,
    pub tag: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub server: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub security: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alter_id: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tls: Option<TlsConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TlsConfig {
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub insecure: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteConfig {
    pub rules: Vec<RouteRule>,
    pub auto_detect_interface: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RouteRule {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain_suffix: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_cidr: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<Vec<u16>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outbound: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsConfig {
    pub servers: Vec<DnsServer>,
    pub rules: Vec<DnsRule>,
    pub strategy: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsServer {
    pub tag: String,
    pub address: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_resolver: Option<String>,
    pub detour: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DnsRule {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain_suffix: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub outbound: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server: Option<String>,
}

// ==========================================================
// 生成配置逻辑
// ==========================================================

// ✅ 修改：新增 allow_lan 参数
pub fn generate_singbox_config(
    node: &Node,
    mode: &str,
    port: u16,
    whitelist: &[String],
    allow_lan: bool,
) -> SingBoxConfig {
    let proxy_outbound = convert_node_to_outbound(node);

    let direct_outbound = Outbound {
        outbound_type: "direct".to_string(),
        tag: "direct".to_string(),
        server: None,
        server_port: None,
        uuid: None,
        security: None,
        alter_id: None,
        password: None,
        method: None,
        tls: None,
    };

    // ✅ 逻辑：如果允许局域网，监听 0.0.0.0，否则监听 127.0.0.1
    let listen_address = if allow_lan { "0.0.0.0" } else { "127.0.0.1" };

    let mixed_inbound = Inbound {
        inbound_type: "mixed".to_string(),
        tag: "mixed-in".to_string(),
        listen: listen_address.to_string(),
        listen_port: port,
    };

    // --- 路由规则 ---
    let mut rules = Vec::new();

    // 1. 节点域名直连
    rules.push(RouteRule {
        protocol: None,
        domain: Some(vec![node.address.clone()]),
        domain_suffix: None,
        ip_cidr: None,
        port: None,
        outbound: Some("direct".to_string()),
    });

    // 2. 规则模式处理
    if mode == "Rule" {
        if !whitelist.is_empty() {
            rules.push(RouteRule {
                protocol: None,
                domain: None,
                domain_suffix: Some(whitelist.to_vec()),
                ip_cidr: None,
                port: None,
                outbound: Some("direct".to_string()),
            });
        }

        rules.push(RouteRule {
            protocol: None,
            domain: None,
            domain_suffix: Some(vec!["cn".to_string()]),
            ip_cidr: None,
            port: None,
            outbound: Some("direct".to_string()),
        });
    }

    // 3. 兜底规则
    let final_tag = match mode {
        "Direct" => "direct",
        _ => "proxy",
    };
    rules.push(RouteRule {
        protocol: None,
        domain: None,
        domain_suffix: None,
        ip_cidr: None,
        port: None,
        outbound: Some(final_tag.to_string()),
    });

    // --- DNS 配置 ---
    let mut dns_rules = vec![DnsRule {
        domain: Some(vec![node.address.clone()]),
        domain_suffix: None,
        outbound: None,
        server: Some("local".to_string()),
    }];

    if mode == "Rule" && !whitelist.is_empty() {
        dns_rules.push(DnsRule {
            domain: None,
            domain_suffix: Some(whitelist.to_vec()),
            outbound: None,
            server: Some("local".to_string()),
        });
    }

    dns_rules.push(DnsRule {
        domain: None,
        domain_suffix: None,
        outbound: None,
        server: Some("google".to_string()),
    });

    let dns_config = DnsConfig {
        strategy: "ipv4_only".to_string(),
        servers: vec![
            DnsServer {
                tag: "google".to_string(),
                address: "8.8.8.8".to_string(),
                address_resolver: None,
                detour: Some("proxy".to_string()),
            },
            DnsServer {
                tag: "local".to_string(),
                address: "223.5.5.5".to_string(),
                address_resolver: None,
                detour: Some("direct".to_string()),
            },
        ],
        rules: dns_rules,
    };

    SingBoxConfig {
        log: LogConfig {
            level: "info".to_string(),
            output: "".to_string(),
        },
        inbounds: vec![mixed_inbound],
        outbounds: vec![proxy_outbound, direct_outbound],
        route: RouteConfig {
            rules,
            auto_detect_interface: true,
        },
        dns: dns_config,
    }
}

fn convert_node_to_outbound(node: &Node) -> Outbound {
    let mut out = Outbound {
        outbound_type: node.protocol.clone(),
        tag: "proxy".to_string(),
        server: Some(node.address.clone()),
        server_port: Some(node.port),
        uuid: None,
        security: None,
        alter_id: None,
        password: None,
        method: None,
        tls: None,
    };

    if node.protocol == "vmess" {
        out.uuid = node.uuid.clone();
        out.security = Some("auto".to_string());
        out.alter_id = Some(0);
    } else if node.protocol == "trojan" {
        out.password = node.password.clone();
        out.tls = Some(TlsConfig {
            enabled: true,
            server_name: node.sni.clone(),
            insecure: Some(true),
        });
    } else if node.protocol == "ss" {
        out.outbound_type = "shadowsocks".to_string();
        out.password = node.password.clone();
        out.method = node.cipher.clone();
    }
    out
}
