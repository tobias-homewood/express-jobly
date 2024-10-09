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

    /**
     * Find all jobs that match the query parameters: title, minSalary, hasEquity
     * 
     * @example find({ title: 'engineer', minSalary: 100000, hasEquity: true })
     * @param {Object} queryParams 
     * @returns [{ id, title, salary, equity, companyHandle }, ...]
     * @throws BadRequestError if any of the query parameters are invalid
     */
    static async find(queryParams) {
        if (Object.keys(queryParams).length === 0) {
            return await Job.findAll();
        }
        // The params are going to be validated by the jsonschema in the route

        // Build the query
        let query = `SELECT id,
                            title,
                            salary,
                            equity,
                            company_handle AS "companyHandle"
                     FROM jobs`;

        // We will store all the filters in the query
        let whereClause = [];
        // These will be the values in the query in the same order as the whereClause
        let values = [];
        let idx = 1;

        // Loop through the query params and add the filters to the query
        for (let key in queryParams) {
            if (key === "title") {
                values.push(`%${queryParams[key]}%`);
                whereClause.push(`title ILIKE $${idx}`);
                idx++;
            } else if (key === "minSalary") {
                values.push(queryParams[key]);
                whereClause.push(`salary >= $${idx}`);
                idx++;
            } else if (key === "hasEquity" && queryParams[key] === "true") {
                whereClause.push(`equity > 0`);
            } else if (key === "hasEquity" && queryParams[key] === "false") {
                whereClause.push(`equity = 0`);
            } else {
                throw new BadRequestError(`Invalid query param: ${key}`);
            }
        }

        // If we have any filters, add the WHERE clause
        if (whereClause.length > 0) {
            query += " WHERE " + whereClause.join(" AND ");
        }
        query += " ORDER BY title";

        const jobsRes = await db.query(query, values);
        jobsRes.rows.forEach(job => job.equity = Number(job.equity));
        return jobsRes.rows;
    }

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
