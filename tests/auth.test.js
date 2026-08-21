import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("POST /api/auth/register", () => {
  it("registers a new user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "password123",
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("test@example.com");
    expect(res.body.password).toBeUndefined();
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    const payload = { email: "dup@example.com", password: "password123" };
    await request(app).post("/api/auth/register").send(payload);
    const res = await request(app).post("/api/auth/register").send(payload);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  const credentials = { email: "login@example.com", password: "password123" };

  it("logs in with correct credentials and returns a token", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app).post("/api/auth/login").send(credentials);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.email).toBe(credentials.email);
  });

  it("rejects an incorrect password", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app).post("/api/auth/login").send({
      email: credentials.email,
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  it("rejects a nonexistent email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "password123",
    });
    expect(res.status).toBe(401);
  });
});
