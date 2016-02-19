"use strict";

var gulp = require('gulp'),
    boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp);

boilerplate({
  build: 'appium-uiautomator2',
  jscs: false,
  e2eTest: { android: true }
});
