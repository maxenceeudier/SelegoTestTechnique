const express = require("express");
const passport = require("passport");
const router = express.Router();

const ActivityObject = require("../models/activity");
const ProjectObject = require("../models/project");
const UserObject = require("../models/user");
const AuthObject = require("../auth");

const { validatePassword } = require("../utils");

const UserAuth = new AuthObject(UserObject);

const SERVER_ERROR = "SERVER_ERROR";
const USER_ALREADY_REGISTERED = "USER_ALREADY_REGISTERED";
const PASSWORD_NOT_VALIDATED = "PASSWORD_NOT_VALIDATED";

router.post("/signin", (req, res) => UserAuth.signin(req, res));
router.post("/logout", (req, res) => UserAuth.logout(req, res));
router.post("/signup", (req, res) => UserAuth.signup(req, res));

router.get("/signin_token", passport.authenticate("user", { session: false }), (req, res) => UserAuth.signinToken(req, res));

router.get("/available", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const users = await UserObject.find({ availability: { $ne: "not available" }, organisation: req.user.organisation }).sort("-last_login_at");

    return res.status(200).send({ ok: true, data: users });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const data = await UserObject.findOne({ _id: req.params.id });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.post("/", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    if (!validatePassword(req.body.password)) return res.status(401).send({ ok: false, user: null, code: PASSWORD_NOT_VALIDATED });

    const userAlreadyExist = await UserObject.findOne({name: req.user.username});
    if (userAlreadyExist) return res.status(409).send({ ok: false, code: USER_ALREADY_REGISTERED });

    const user = await UserObject.create({ ...req.body, organisation: req.user.organisation });

    return res.status(200).send({ data: user, ok: true });
  } catch (error) {
    if (error.code === 11000) return res.status(409).send({ ok: false, code: USER_ALREADY_REGISTERED });
    console.log(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

router.get("/", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const users = await UserObject.find({ ...req.query, organisation: req.user.organisation }).sort("-last_login_at");
    return res.status(200).send({ ok: true, data: users });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.put("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const obj = req.body;

    const user = await UserObject.findByIdAndUpdate(req.params.id, obj, { new: true });
    res.status(200).send({ ok: true, user });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.put("/", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const obj = req.body;
    const data = await UserObject.findByIdAndUpdate(req.user._id, obj, { new: true });
    res.status(200).send({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.delete("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const users = await UserObject.find({ organisation: req.user.organisation });
    /*if we del the last user of the organisation*/
    if (users.length === 1)
    {
      const projects = await ProjectObject.find({organisation: req.user.organisation});
      const delOrganisation = projects.map(async (e) => {
        await ProjectObject.findOneAndRemove({_id: e.id});
        await ActivityObject.findOneAndRemove({projectId: e.id});
      });
      await Promise.all(delOrganisation);
    }
    await UserObject.findOneAndRemove({ _id: req.params.id });
    res.status(200).send({ ok: true });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

module.exports = router;
