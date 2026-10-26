# ⚡ A.R.E.S. Native MCP Server (`ares-mcp`)

Servidor oficial de herramientas tácticas bajo el estándar abierto **Model Context Protocol (MCP)** de Anthropic, compatible con **Cursor**, **Claude Desktop**, **Google Antigravity**, **VS Code** (Continue / Cline / Roo Code) y cualquier agente inteligente compatible con MCP.

---

## 🛠️ Herramientas Expuestas

| Herramienta | Descripción |
| :--- | :--- |
| `ares_audit_code` | **Espada Binaria**: Análisis SOLID, complejidad Big-O, OWASP Top 10 y refactorización de código en TypeScript, Python, etc. |
| `ares_forge_documentation` | **Escudo Aegis**: Generación de arquitectura técnica (README, ADRs, RFCs, OpenAPI 3.1, diagramas Mermaid C4). |
| `ares_forge_tests` | **Test Forge**: Generador de suites completas de pruebas unitarias (Vitest, Jest, PyTest, GoTest) con cobertura de casos borde. |
| `ares_bio_telemetry` | **Protocolo Bio-Armadura**: Lectura del estado de salud, estamina, hidratación y fatiga del Comandante. |
| `ares_ask` | **Oráculo Multimodal**: Consulta directa a los modelos de A.R.E.S. (Gemini 3 Flash, DeepSeek V3, DeepSeek R1, Claude 3.5 Sonnet, GPT-4o). |
| `ares_generate_changelog` | **SemVer Engine**: Generación automática de notas de versión y actualización de `CHANGELOG.md` basado en Conventional Commits. |
| `ares_spartan_status` | **Pre-Push Guardian**: Comprueba si el entorno permite despliegues en el horario actual o si la fatiga nocturna los bloquea. |

---

## 🚀 Instalación y Configuración

### 1. Claude Desktop
Agrega lo siguiente en tu archivo de configuración de Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ares": {
      "command": "node",
      "args": ["D:/ares-ecosystem/mcp/dist/index.js"],
      "env": {
        "ARES_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 2. Cursor IDE
En los ajustes de Cursor (`Features` ➔ `MCP Servers`), agrega:
- **Name:** `ares`
- **Type:** `command`
- **Command:** `node D:/ares-ecosystem/mcp/dist/index.js`

### 3. Google Antigravity
En la configuración de servidores MCP (`mcp_config.json` o sidecar):

```json
{
  "mcpServers": {
    "ares": {
      "command": "node",
      "args": ["D:/ares-ecosystem/mcp/dist/index.js"]
    }
  }
}
```

---

## 🔨 Compilación Manual

```bash
cd D:\ares-ecosystem\mcp
npm run build
```
