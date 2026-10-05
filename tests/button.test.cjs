const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createRequire } = require('node:module');
const path = require('node:path');
const filename = path.resolve('components/ui/button.tsx');
const localRequire = createRequire(filename);
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
}).outputText;
const exportsObject = {};
new Function('require', 'exports', source)(name => name === '@/lib/utils/index'
  ? { cn: (...values) => require('tailwind-merge').twMerge(require('clsx').clsx(values)) }
  : name === '@/components/icons' || name === 'lucide-react' ? { Loader: props => React.createElement('svg', props) } : localRequire(name), exportsObject);
const { Button } = exportsObject;
const link = React.createElement('a', { href: '/inbox' }, 'Inbox');
const markup = renderToStaticMarkup(React.createElement(Button, { asChild: true, loading: true }, link));
assert.match(markup, /^<a /, 'loading must preserve the slotted link');
assert.match(markup, /aria-busy="true"/);
assert.match(markup, /aria-disabled="true"/);
assert.match(markup, /Inbox/);
assert.equal((markup.match(/<svg/g) || []).length, 1, 'one loading indicator');
let clicks = 0, prevented = false, stopped = false;
const blocked = Button.render({ loading: true, onClickCapture: () => clicks++ }, null);
blocked.props.onClickCapture({ preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
assert.equal(clicks, 0);
assert.ok(prevented && stopped, 'loading blocks navigation and child handlers');
const enabled = Button.render({ onClickCapture: () => clicks++ }, null);
enabled.props.onClickCapture({});
assert.equal(clicks, 1, 'enabled capture callback preserved');
console.log('Button loading, composition, and interaction checks passed');
