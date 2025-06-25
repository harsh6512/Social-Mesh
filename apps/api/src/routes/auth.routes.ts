import {Router} from 'express'
import passport from "passport";

const router=Router()
router.get('/google/signin',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'signin'
  })
);

router.get('/google/signup',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: 'signup'
  })
);


router.get('/google/callback', passport.authenticate('google', {
    successRedirect: '',
    failureRedirect: '',
}), (req, res) => {

})

export default router