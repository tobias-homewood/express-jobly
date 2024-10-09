"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

describe("create", function () {
    const newJob = {
        title: "new",
        salary: 100,
        equity: 0.1,
        companyHandle: "c1",
    };

    test("works", async function () {
        let job = await Job.create(newJob);
        expect(job).toEqual({...newJob, id: 4});

        const result = await db.query(
            `SELECT title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE title = 'new'
            AND company_handle = 'c1'`);
        expect(result.rows).toEqual([{...newJob, equity: "0.1"}]);
    });

    test("bad request with dupe", async function () {
        try {
            await Job.create(newJob);
            await Job.create(newJob);
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

describe("read", function () {
    test("findAll works", async function () {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([
            {
                id: 1,
                title: "j1",
                salary: 100,
                equity: 0.1,
                companyHandle: "c1",
            },
            {
                id: 2,
                title: "j2",
                salary: 200,
                equity: 0.2,
                companyHandle: "c2",
            },
            {
                id: 3,
                title: "j3",
                salary: 300,
                equity: 0.3,
                companyHandle: "c3",
            },
        ]);
    });

    test("get works", async function () {
        let job = await Job.get(1);
        expect(job).toEqual({
            id: 1,
            title: "j1",
            salary: 100,
            equity: 0.1,
            companyHandle: "c1",
            id: 1,
        });
    });

    test("not found if no such job", async function () {
        try {
            await Job.get(1000);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

describe("update", function () {
    const updateData = {
        title: "new",
        salary: 500,
        equity: 0.5,
    };

    test("works", async function () {
        let job = await Job.update(1, updateData);
        expect(job).toEqual({
            id: 1,
            companyHandle: "c1",
            ...updateData,
        });

        const result = await db.query(
            `SELECT title, salary, equity, company_handle
            FROM jobs
            WHERE id = 1`);
        expect(result.rows).toEqual([{
            ...updateData,
            company_handle: "c1",
            equity: "0.5",
        }]);
    });

    test("not found if no such job", async function () {
        try {
            await Job.update(1000, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            await Job.update(1, {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });

    test("bad request with id change", async function () {
        try {
            await Job.update(1, { id: 1000 });
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });

    test("bad request with companyHandle change", async function () {
        try {
            await Job.update(1, { companyHandle: "c2" });
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

describe("delete", function () {
    test("remove works", async function () {
        await Job.remove(1);
        const res = await db.query(
            "SELECT id FROM jobs WHERE id=1");
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such job", async function () {
        try {
            await Job.remove(1000);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});