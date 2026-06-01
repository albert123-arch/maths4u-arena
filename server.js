process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || "3000";

void import("./.next/standalone/server.js");
