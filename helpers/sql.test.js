const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");

describe("sqlForPartialUpdate", function () {
    test("works: valid data", function () {
        const dataToUpdate = { firstName: "Aliya", age: 32 };
        const jsToSql = { firstName: "first_name" };
        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ["Aliya", 32],
        });
    });

    test("works: no jsToSql mapping", function () {
        const dataToUpdate = { firstName: "Aliya", age: 32 };
        const jsToSql = {};
        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
        expect(result).toEqual({
            setCols: '"firstName"=$1, "age"=$2',
            values: ["Aliya", 32],
        });
    });

    test("throws BadRequestError if no data", function () {
        try {
            sqlForPartialUpdate({}, {});
            throw new Error("Test failed: should have thrown BadRequestError");
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});
