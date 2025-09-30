import { connect, query } from "./pg-connector";

async function testConnection() {
  try {
    await connect();
    const result = await query("SELECT NOW()");
    console.log("Conexión exitosa:", result.rows[0]);
  } catch (error) {
    console.error("Error de conexión:", error);
  }
}

testConnection();
