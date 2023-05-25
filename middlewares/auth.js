const jwt = require("jsonwebtoken");

const jwtSecret = "mysecrettoken";

module.exports = function (req, res, next) {
	// Get token from header
	const token = req.header("x-auth-token");

	// Check if there is no token
	if (!token) {
		return res.status(401).json({ errors: [{ msg: "No token, authorization denied" }] });
	}

	try {
		// Verify token
		const decoded = jwt.verify(token, jwtSecret);
		req.user = decoded.user;
		next();
	} catch (err) {
		res.status(401).json({ errors: [{ msg: "Token is not valid", error: err.message }] });
	}
};
