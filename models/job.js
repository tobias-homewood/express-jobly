"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
     * 
     * data should be { title, salary, equity, companyHandle }
     * 
     * Returns { id, title, salary, equity, companyHandle }
     * 
     * Throws BadRequestError if job already in database.
     */
    static async create({ title, salary, equity, companyHandle }) {
        const duplicateCheck = await db.query(
            `SELECT title, company_handle
            FROM jobs
            WHERE title = $1
            AND company_handle = $2`,
            [title, companyHandle]);

        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate job: ${title}, at company: ${companyHandle}`);

        const result = await db.query(
            `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [
                title,
                salary,
                equity,
                companyHandle,
            ],
        );
        const job = result.rows[0];
        job.equity = Number(job.equity);

        return job;
    }

    /** Find all jobs.
     * 
     * Returns [{ id, title, salary, equity, companyHandle }, ...]
     */
    static async findAll() {
        const jobsRes = await db.query(
            `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"
            FROM jobs
            ORDER BY title`);
        jobsRes.rows.forEach(job => job.equity = Number(job.equity));
        return jobsRes.rows;
    }

    // TODO
    static async find() {}

    /** Given a job id, return data about job.
     * 
     * Returns { id, title, salary, equity, companyHandle }
     * 
     * Throws NotFoundError if job not found.
     */
    static async get(id) {
        const jobRes = await db.query(
            `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`,
            [id]);

        const job = jobRes.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);
        job.equity = Number(job.equity);
        return job;
    }

    /** Update job data with `data`.
     * 
     * This is a "partial update" --- it is okay if data does not contain all the fields; this only changes provided fields.
     * 
     * Data can include: { title, salary, equity }
     * 
     * Returns { id, title, salary, equity, companyHandle }
     * 
     * Throws NotFoundError if not found.
     */
    static async update(id, data) {
        // Can only update certain fields: title, salary, equity
        if (Object.keys(data).length === 0) throw new BadRequestError("No data");  // No data to update

        // Check if any of the keys is not one of the allowed keys
        if (Object.keys(data).some(key => key !== "title" && key !== "salary" && key !== "equity")) throw new BadRequestError("Invalid data");


        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                companyHandle: "company_handle"
            });
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs
                          SET ${setCols}
                          WHERE id = ${idVarIdx}
                          RETURNING id,
                                    title,
                                    salary,
                                    equity,
                                    company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);
        job.equity = Number(job.equity);
        return job;
    }

    /** Delete given job from database; returns undefined.
     * 
     * Throws NotFoundError if job not found.
     */
    static async remove(id) {
        const result = await db.query(
            `DELETE
            FROM jobs
            WHERE id = $1
            RETURNING id`,
            [id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);
    }
}


module.exports = Job;
