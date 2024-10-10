"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  a1Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
    const newJob= {
        title: "new",
        salary: 100,
        equity: 0.1,
        companyHandle: "c1",
    };

    test("ok for admins", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: {
                id: expect.any(Number),
                ...newJob
            },
        });
    });

    test("unauth for users", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob);
        expect(resp.statusCode).toEqual(401);
    });

    test("bad request with missing data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "new",
            })
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                ...newJob,
                salary: "not-a-number",
            })
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        const resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: "j1",
                    salary: 100,
                    equity: 0,
                    companyHandle: "c1",
                },
                {
                    id: expect.any(Number),
                    title: "j2",
                    salary: 200,
                    equity: 0.2,
                    companyHandle: "c2",
                },
                {
                    id: expect.any(Number),
                    title: "j3",
                    salary: 300,
                    equity: 0.3,
                    companyHandle: "c3",
                },
            ],
        });
    });

    test("works: title filter", async function () {
        const resp = await request(app).get("/jobs").query({ title: "1" });
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: "j1",
                    salary: 100,
                    equity: 0,
                    companyHandle: "c1",
                },
            ],
        });
    });

    test("works: minSalary filter", async function () {
        const resp = await request(app).get("/jobs").query({ minSalary: 200 });
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: "j2",
                    salary: 200,
                    equity: 0.2,
                    companyHandle: "c2",
                },
                {
                    id: expect.any(Number),
                    title: "j3",
                    salary: 300,
                    equity: 0.3,
                    companyHandle: "c3",
                },
            ],
        });
    });

    test("works: hasEquity filter", async function () {
        const resp = await request(app).get("/jobs").query({ hasEquity: true });
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: "j2",
                    salary: 200,
                    equity: 0.2,
                    companyHandle: "c2",
                },
                {
                    id: expect.any(Number),
                    title: "j3",
                    salary: 300,
                    equity: 0.3,
                    companyHandle: "c3",
                },
            ],
        });
    });

    test("works: does not have equity filter", async function () {
        const resp = await request(app).get("/jobs").query({ hasEquity: false });
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: "j1",
                    salary: 100,
                    equity: 0,
                    companyHandle: "c1",
                },
            ],
        });
    });

    test("works: all filters", async function () {
        const resp = await request(app).get("/jobs").query({ title: "3", minSalary: 200, hasEquity: true });
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: "j3",
                    salary: 300,
                    equity: 0.3,
                    companyHandle: "c3",
                },
            ],
        });
    });

    test("bad request with invalid filter key", async function () {
        const resp = await request(app).get("/jobs").query({ minSalary: 200, invalid: "nope" });
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid filter value", async function () {
        const resp = await request(app).get("/jobs").query({ minSalary: "not-a-number" });
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid filter value", async function () {
        const resp = await request(app).get("/jobs").query({ hasEquity: "not-a-boolean" });
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid filter value", async function () {
        const resp = await request(app).get("/jobs").query({ minSalary: -1 });
        expect(resp.statusCode).toEqual(400);
    });

    test("fails: test next() handler", async function () {
        await db.query("DROP TABLE jobs CASCADE");
        const resp = await request(app).get("/jobs");
        expect(resp.statusCode).toEqual(500);
    });
});

/************************************** GET /jobs/:id */
describe("GET /jobs/:id", function () {
    test("works for anon", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app).get(`/jobs/${jobId}`);
        expect(resp.body).toEqual({
            job: {
                id: jobId,
                title: "j1",
                salary: 100,
                equity: 0,
                companyHandle: "c1",
            },
        });
    });

    test("not found for no such job", async function () {
        const resp = await request(app).get(`/jobs/0`);
        expect(resp.statusCode).toEqual(404);
    });
});

/************************************** PATCH /jobs/:id */
describe("PATCH /jobs/:id", function () {
    test("works for admins", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${jobId}`)
            .send({
                title: "j1-new",
            })
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.body).toEqual({
            job: {
                id: jobId,
                title: "j1-new",
                salary: 100,
                equity: 0,
                companyHandle: "c1",
            },
        });
    });

    test("unauth for users", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${jobId}`)
            .send({
                title: "j1-new",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for anon", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${jobId}`)
            .send({
                title: "j1-new",
            });
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such job", async function () {
        const resp = await request(app)
            .patch(`/jobs/0`)
            .send({
                title: "new",
            })
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on id change attempt", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${jobId}`)
            .send({
                id: 0,
            })
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on companyHandle change attempt", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${jobId}`)
            .send({
                companyHandle: "c2",
            })
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on invalid data", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${jobId}`)
            .send({
                salary: "not-a-number",
            })
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on invalid data", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${jobId}`)
            .send({
                salary: -1,
            })
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

});


/************************************** DELETE /jobs/:id */
describe("DELETE /jobs/:id", function () {
    test("works for admins", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${jobId}`)
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.body).toEqual({ deleted: `${jobId}` });
    });

    test("unauth for users", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${jobId}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for anon", async function () {
        const jobsRes = await db.query("SELECT id FROM jobs WHERE title = 'j1'");
        const jobId = jobsRes.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${jobId}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such job", async function () {
        const resp = await request(app)
            .delete(`/jobs/0`)
            .set("authorization", `Bearer ${a1Token}`);
        expect(resp.statusCode).toEqual(404);
    });
});