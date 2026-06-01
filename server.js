process.env.HOSTNAME = "0.0.0.0";
process.env.PORT = "3000";

process.on("uncaughtException", (error) => {
  console.error("Uncaught server exception", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled server rejection", error);
});

console.log("Starting Maths4U Arena on 0.0.0.0:3000");

void import("./.next/standalone/server.js");
