"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureIsAdmin, ensureIsAdminOrUser } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const Job = require("../models/job");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: login, admin
 **/

router.post("/", ensureLoggedIn, ensureIsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: login, admin
 **/

router.get("/", ensureLoggedIn, ensureIsAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin, jobs }
 *
 * Authorization required: login, is an admin or the user themselves of this username
 **/

router.get("/:username", ensureLoggedIn, ensureIsAdminOrUser, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);
    user.jobs = await Job.getAppliedJobs(req.params.username); // returns an array of job ids
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: login, is an admin or the user themselves of this username
 **/

router.patch("/:username", ensureLoggedIn, ensureIsAdminOrUser, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: login, is an admin or the user themselves of this username
 **/

router.delete("/:username", ensureLoggedIn, ensureIsAdminOrUser, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});

/** POST /[username]/jobs/[id]  =>  { applied: jobId }
 * 
 * Post a new job application for the user
 * 
 * Authorization required: login, is an admin or the user themselves of this username
 * 
 * Throws BadRequestError if the user has already applied to the job or the job does not exist
 */

router.post("/:username/jobs/:id", ensureLoggedIn, ensureIsAdminOrUser, async function (req, res, next) {
  try {
    const { username, id: jobId } = req.params; // example { username: 'john', id: 1 }
    const result = await User.applyToJob(username, jobId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
