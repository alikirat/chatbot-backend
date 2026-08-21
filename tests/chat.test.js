import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

async function registerAndLoginUser(email) {
  const payload = { email, password: "password123" };
  await request(app).post("/api/auth/register").send(payload);
  const res = await request(app).post("/api/auth/login").send(payload);
  return res.body.token;
}

const validChat = {
  title: "Chat 1",
  messages: [{ role: "user", content: "Hello" }],
};

describe("POST /api/chat", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/api/chat").send(validChat);
    expect(res.status).toBe(401);
  });

  it("creates a chat owned by the authenticated user", async () => {
    const token = await registerAndLoginUser("owner1@example.com");
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send(validChat);
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Chat 1");
  });
});

describe("GET /api/chat", () => {
  it("only returns the requesting user's own chats", async () => {
    const tokenA = await registerAndLoginUser("chatA@example.com");
    const tokenB = await registerAndLoginUser("chatB@example.com");

    await request(app).post("/api/chat").set("Authorization", `Bearer ${tokenA}`).send(validChat);
    await request(app).post("/api/chat").set("Authorization", `Bearer ${tokenB}`).send(validChat);

    const res = await request(app).get("/api/chat").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

describe("GET /api/chat/:id (ownership)", () => {
  it("lets the owner fetch their own chat", async () => {
    const token = await registerAndLoginUser("getowner@example.com");
    const createRes = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send(validChat);

    const res = await request(app)
      .get(`/api/chat/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("blocks a different user from fetching someone else's chat", async () => {
    const ownerToken = await registerAndLoginUser("getowner2@example.com");
    const otherToken = await registerAndLoginUser("getintruder@example.com");

    const createRes = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(validChat);

    const res = await request(app)
      .get(`/api/chat/${createRes.body._id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for a nonexistent chat", async () => {
    const token = await registerAndLoginUser("get404@example.com");
    const res = await request(app)
      .get("/api/chat/000000000000000000000000")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/chat/:id (ownership)", () => {
  it("lets the owner update their own chat", async () => {
    const token = await registerAndLoginUser("patchowner@example.com");
    const createRes = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send(validChat);

    const res = await request(app)
      .patch(`/api/chat/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Renamed Chat" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed Chat");
  });

  it("blocks a different user from updating someone else's chat", async () => {
    const ownerToken = await registerAndLoginUser("patchowner2@example.com");
    const otherToken = await registerAndLoginUser("patchintruder@example.com");

    const createRes = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(validChat);

    const res = await request(app)
      .patch(`/api/chat/${createRes.body._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked" });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/chat/:id (ownership)", () => {
  it("lets the owner delete their own chat", async () => {
    const token = await registerAndLoginUser("delowner@example.com");
    const createRes = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${token}`)
      .send(validChat);

    const res = await request(app)
      .delete(`/api/chat/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("blocks a different user from deleting someone else's chat", async () => {
    const ownerToken = await registerAndLoginUser("delowner2@example.com");
    const otherToken = await registerAndLoginUser("delintruder@example.com");

    const createRes = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(validChat);

    const res = await request(app)
      .delete(`/api/chat/${createRes.body._id}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/chat/completion", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/api/chat/completion").send({ messages: [] });
    expect(res.status).toBe(401);
  });

  it("rejects a request missing the messages array", async () => {
    const token = await registerAndLoginUser("completion@example.com");
    const res = await request(app)
      .post("/api/chat/completion")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
