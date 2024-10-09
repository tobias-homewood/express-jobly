"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /**
   * Find all companies, filtering based on query parameters: minEmployees, maxEmployees, name
   * 
   * @example find({ minEmployees: 10, maxEmployees: 100, name: 'apple' })
   * 
   * @param {Object} queryParams
   * @returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * @throws BadRequestError if it contains invalid parameters
   */
  static async find(queryParams) {
    if (Object.keys(queryParams).length === 0) {
      return await Company.findAll();
    }

    // Check if the query parameters are valid
    if (queryParams.minEmployees > queryParams.maxEmployees) {
      throw new BadRequestError("Min employees cannot be greater than max employees");
    }

    // Generate the base query
    let query = `SELECT handle,
                        name,
                        description,
                        num_employees AS "numEmployees",
                        logo_url AS "logoUrl"
                 FROM companies`;

    // We will store all the filters that are passed in the query
    let whereClause = [];
    // With all the values in an array to match in the query
    let values = [];
    let idx = 1;

    // Loop each possible key: minEmployees, maxEmployees, name
    for (let key in queryParams) {
      // Only add the valid keys
      if (key === "minEmployees") {
        whereClause.push(`num_employees >= $${idx}`);
        values.push(queryParams[key]);
        idx++;
      } else if (key === "maxEmployees") {
        whereClause.push(`num_employees <= $${idx}`);
        values.push(queryParams[key]);
        idx++;
      } else if (key === "name") {
        whereClause.push(`name ILIKE $${idx}`);
        values.push(`%${queryParams[key]}%`);
        idx++;
      } else {
        throw new BadRequestError(`Invalid filter parameter: ${key}`);
      }
    }

    // If we have any filters, add the WHERE clause
    if (whereClause.length > 0) {
      query += " WHERE " + whereClause.join(" AND ");
    }
    query += " ORDER BY name";

    const companiesRes = await db.query(query, values);
    return companiesRes.rows;
  }

  

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
