const { BadRequestError } = require("../expressError");


/**
 * Generates a SQL partial update query string and corresponding values array from a JavaScript object.
 *
 * This function is useful for dynamically creating SQL update statements based on the provided data.
 * It maps JavaScript object keys to SQL column names using the provided mapping object.
 *
 * @example
 * sqlForPartialUpdate({ firstName: 'Aliya', age: 32 }, { firstName: 'first_name' });
 * => { 
 *        setCols: '"first_name"=$1, "age"=$2', 
 *        values: ['Aliya', 32]
 * }
 * 
 * @param {Object} dataToUpdate - An object containing the keys and values to update.
 * @param {Object} jsToSql - An object that maps JavaScript object keys to SQL column names.
 * @returns {Object} An object containing the SQL partial update string (`setCols`) and an array of values (`values`).
 * @throws {BadRequestError} If the `dataToUpdate` object is empty.
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
