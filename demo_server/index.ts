import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";

const MOCK_DB = {
  users: [
    { id: 1, name: "Alice Dupont", email: "alice@example.com", role: "admin" },
    { id: 2, name: "Bob Martin", email: "bob@example.com", role: "customer" },
  ],
  products: [
    { id: 101, name: "Laptop Pro", price: 1299.99, stock: 45 },
    { id: 102, name: "Wireless Mouse", price: 29.99, stock: 120 },
    { id: 103, name: "Mechanical Keyboard", price: 149.99, stock: 15 },
  ],
};

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Demo E-Commerce API",
          version: "1.0.0",
          description: "Micro-serveur factice pour le projet Echo",
        },
      },
    })
  )
  .group("/api", (app) =>
    app
      .get("/users", () => MOCK_DB.users, {
        detail: { summary: "List Users" },
        response: t.Array(
          t.Object({
            id: t.Number(),
            name: t.String(),
            email: t.String(),
            role: t.String(),
          })
        ),
      })
      .get("/users/:id", ({ params: { id }, set }) => {
        const user = MOCK_DB.users.find((u) => u.id === id);
        if (!user) {
          set.status = 404;
          return { error: "User not found" };
        }
        return user;
      }, {
        detail: { summary: "Get User" },
        params: t.Object({ id: t.Numeric() }),
      })
      .post("/users", ({ body }) => {
        return { id: 3, message: "User created successfully" };
      }, {
        detail: { summary: "Create User" },
        body: t.Any(),
      })
      .put("/users/:id", ({ params: { id }, body }) => {
        return { message: "User updated successfully" };
      }, {
        detail: { summary: "Update User" },
        params: t.Object({ id: t.Numeric() }),
        body: t.Any(),
      })
      .delete("/users/:id", ({ params: { id } }) => {
        return { message: "User deleted successfully" };
      }, {
        detail: { summary: "Delete User" },
        params: t.Object({ id: t.Numeric() }),
      })
      
      .get("/products", () => MOCK_DB.products, {
        detail: { summary: "List Products" },
      })
      .get("/products/search", ({ query: { q } }) => {
        const query = q?.toLowerCase() || "";
        return MOCK_DB.products.filter((p) => p.name.toLowerCase().includes(query));
      }, {
        detail: { summary: "Search Products" },
        query: t.Object({ q: t.Optional(t.String()) }),
      })
      
      .post("/orders", () => {
        return { orderId: "ORD-999888", status: "processing" };
      }, {
        detail: { summary: "Checkout Order" },
      })
      
      .get("/stats/revenue", () => {
        return { totalRevenue: 154200.5, currentMonth: 42000.0, trend: "+12%" };
      }, {
        detail: { summary: "Revenue Stats" },
      })
      
      .get("/health", () => {
        return { status: "ok", uptime: process.uptime() };
      }, {
        detail: { summary: "Health Check" },
      })
  )
  .listen(8080);

console.log(`🚀 Demo Server running at http://${app.server?.hostname}:${app.server?.port}`);
console.log(`📖 Swagger UI available at http://${app.server?.hostname}:${app.server?.port}/swagger`);