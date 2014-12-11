var fs = require('fs'),
    UglifyJS = require('uglify-js'),
    _ = require('underscore');

var packageInfo = JSON.parse(fs.readFileSync('./package.json', {encoding: 'utf-8'})),
    name = packageInfo.name,
    version = packageInfo.version,
    file = './' + name + '.js',
    minimizedFile = './' + name + '-min.js',
    repo = 'https://github.com/jhudson8/' + name,
    content = fs.readFileSync(file, {encoding: 'utf8'}),
    versionMatcher = new RegExp(name + ' v[0-9\.]+');

content = content.replace(versionMatcher, name + ' v' + version);
fs.writeFileSync(file, content, {encoding: 'utf8'});

var minimized = UglifyJS.minify(file);
var minimizedHeader = '/*!\n * ' + repo + ' v' + version + ';  MIT license; Joe Hudson<joehud_AT_gmail.com>\n */\n';
fs.writeFileSync(minimizedFile, minimizedHeader + minimized.code, {encoding: 'utf8'});

// create with-deps files
var versions = [];
function getContentsAndVersion(name, prefix) {
  prefix = prefix || './node_modules/' + name + '/';
  var contents = fs.readFileSync(prefix + name + '.js', {encoding: 'utf8'});
  var i = contents.indexOf('  // main body start');
  i = contents.indexOf('\n', i);
  contents = contents.substring(i);
  i = contents.indexOf('  // main body end');
  contents = contents.substring(0, i);

  var version = JSON.parse(fs.readFileSync(prefix + 'package.json', {encoding: 'utf8'})).version;

  versions.push({name: name, version: version});
  return {
    name: name,
    contents: contents,
    version: version
  };
}

function sectionData(data) {
  var rtn = '\n\n// jhudson8/';
  rtn += data.name;
  rtn += '\n(function() {\n';
  rtn += data.contents;
  rtn += '\n';
  rtn += '})();\n';
  return rtn;
}

var depContent = '';
depContent += fs.readFileSync('./test/with-deps-header.txt', {encoding: 'utf8'});
_.each(['backbone-xhr-events', 'react-mixin-manager', 'react-events'], function(name) {
  var data = getContentsAndVersion(name);
  depContent += sectionData(data);
});
var data = getContentsAndVersion('react-backbone', './');
depContent += sectionData(data);

depContent += '\n});\n';

var versionData = versions.map(function(data) {
  return '    jhudson8/' + data.name + ' ' + data.version;
}).join('\n');
depContent = depContent.replace('{VERSIONS}', versionData);

// write out the necessary files
fs.writeFileSync('./with-deps.js', depContent, {encoding: 'utf8'});
fs.writeFileSync('./react-backbone-with-deps.js', depContent, {encoding: 'utf8'});

minimized = UglifyJS.minify('./with-deps.js');
minimizedHeader = '/*!\n * ' + repo + ';  MIT license; Joe Hudson<joehud_AT_gmail.com>\n */\n';
fs.writeFileSync('./react-backbone-with-deps.min.js', minimizedHeader + minimized.code, {encoding: 'utf8'});
