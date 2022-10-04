const passport = require('passport');

const { Strategy, ExtractJwt } = require('passport-jwt');

const secret = '9412831hudausdaisd2193812asdjadaoiw91231lasdkassmcan12';

module.exports = (app) => {
  const params = {
    secretOrKey: secret,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // ExtractJwt -> obtem o token
  };

  const strategy = new Strategy(params, (payload, done) => {
    app.services.user.findOne({ id: payload.id }).then((user) => {
      if (user) {
        done(null, { ...payload });
      } else {
        done(null, false);
      }
    }).catch((err) => done(err, false));
  });

  passport.use(strategy);
  return { authenticate: () => passport.authenticate('jwt', { session: false }) };
};
