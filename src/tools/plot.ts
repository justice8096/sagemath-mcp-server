import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { t } from "../i18n.js";
import { executeSage } from "../services/sage-executor.js";
import { PlotSchema } from "../schemas/common.js";

export function registerPlotTool(server: McpServer): void {
  server.registerTool(
    "sage_plot",
    {
      title: "Plot Expression",
      description:
        t("tool.plot.description") ||
        "Plot a mathematical expression over a range and return the resulting PNG image (base64)",
      inputSchema: PlotSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: any) => {
      try {
        const variable = args.variable || "x";
        const xMin = typeof args.x_min === "number" ? args.x_min : -10;
        const xMax = typeof args.x_max === "number" ? args.x_max : 10;
        const title = (args.title || "").replace(/'/g, "");

        // Encode plot as base64 PNG via SageMath subprocess.
        // Uses save() to a temp file then reads + base64-encodes the bytes,
        // because Sage's plot doesn't write directly to a BytesIO target.
        const code = `
import tempfile, base64, os
var('${variable}')
p = plot(${args.expression}, (${variable}, ${xMin}, ${xMax}), title='${title}')
tmpfile = tempfile.mktemp(suffix='.png')
p.save(tmpfile, dpi=80)
with open(tmpfile, 'rb') as fh:
    print(base64.b64encode(fh.read()).decode())
os.unlink(tmpfile)
`;
        const output = await executeSage(code);
        const base64Data = output.trim();

        if (!base64Data) {
          return {
            content: [
              {
                type: "text",
                text:
                  t("errors.empty_plot_output") ||
                  "Plot produced no output. Verify expression and range.",
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "image",
              data: base64Data,
              mimeType: "image/png",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: t("errors.execution_failed", {
                detail: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
