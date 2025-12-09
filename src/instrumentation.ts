export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerOTel } = await import("./instrumentation.node");
    registerOTel();
  }
}
