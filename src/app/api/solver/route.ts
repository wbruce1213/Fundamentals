import { spawn } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export const maxDuration = 300; // 5 minute timeout for solving

type SolverRequest = {
  pot: number;
  effectiveStack: number;
  board: string; // "Qs,Jh,2h" format
  rangeIP: string; // "AA,KK,QQ,..." format
  rangeOOP: string;
  threads: number;
  accuracy: number; // 0.1 to 1.0, lower = more accurate but slower
  maxIterations: number;
};

function buildSolverConfig(req: SolverRequest): string {
  return `set_pot ${req.pot}
set_effective_stack ${req.effectiveStack}
set_board ${req.board}
set_range_ip ${req.rangeIP}
set_range_oop ${req.rangeOOP}
set_bet_sizes oop,flop,bet,${Math.round(req.pot * 0.5)}
set_bet_sizes oop,flop,raise,${Math.round(req.pot * 0.6)}
set_bet_sizes oop,flop,allin
set_bet_sizes ip,flop,bet,${Math.round(req.pot * 0.5)}
set_bet_sizes ip,flop,raise,${Math.round(req.pot * 0.6)}
set_bet_sizes ip,flop,allin
set_allin_threshold 0.67
build_tree
set_thread_num ${req.threads}
set_accuracy ${req.accuracy}
set_max_iteration ${req.maxIterations}
set_print_interval 5
set_use_isomorphism 1
start_solve
dump_result output_result.json
`;
}

export async function POST(req: Request) {
  try {
    // TexasSolver requires local filesystem and binary execution.
    // This route only works during local development (pnpm dev).
    // On Vercel deployments, return 501 Not Implemented.
    if (process.env.VERCEL) {
      return Response.json(
        {
          error: "GTO Solver is a local-only development tool",
          message:
            "TexasSolver requires filesystem access and local binary execution. Use `pnpm dev` locally to access the solver.",
        },
        { status: 501 }
      );
    }

    const body: SolverRequest = await req.json();

    // Validate input
    if (!body.pot || !body.effectiveStack || !body.board) {
      return Response.json(
        { error: "Missing required fields: pot, effectiveStack, board" },
        { status: 400 }
      );
    }

    // @vercel-skip-local-filesystem-check — intentional local-only filesystem use
    const tmpDir = join(tmpdir(), `solver-${randomUUID()}`);
    const configPath = join(tmpDir, "input.txt");
    const outputPath = join(tmpDir, "output_result.json");

    // Write config file
    const config = buildSolverConfig(body);
    // @vercel-skip-local-filesystem-check
    await writeFile(configPath, config);

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ status: "starting", message: "Initializing solver..." })}\n\n`
            )
          );

          const solver = spawn(
            join(process.cwd(), "console_solver"),
            ["-i", configPath],
            { cwd: tmpDir }
          );

          let output = "";
          let errorOutput = "";

          solver.stdout?.on("data", (data) => {
            const line = data.toString();
            output += line;
            // Send progress updates
            if (line.includes("iteration") || line.includes("converged")) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ status: "solving", progress: line.trim() })}\n\n`
                )
              );
            }
          });

          solver.stderr?.on("data", (data) => {
            errorOutput += data.toString();
          });

          await new Promise<void>((resolve, reject) => {
            solver.on("close", (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Solver exited with code ${code}: ${errorOutput}`));
              }
            });
          });

          // Read result
          const resultJson = await readFile(outputPath, "utf-8");
          const result = JSON.parse(resultJson);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ status: "complete", result })}\n\n`
            )
          );
          controller.close();

          // Cleanup
          await Promise.all([
            unlink(configPath),
            unlink(outputPath),
          ]).catch(() => {
            /* ignore cleanup errors */
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ status: "error", error: message })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[/api/solver]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Solver error" },
      { status: 500 }
    );
  }
}
