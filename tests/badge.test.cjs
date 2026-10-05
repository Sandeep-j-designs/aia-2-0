const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createRequire } = require('node:module');
const path = require('node:path');
const filename = path.resolve('components/ui/badge.tsx');
const localRequire = createRequire(filename);
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
}).outputText;
const exportsObject = {};
new Function('require', 'exports', source)(name => name === '@/lib/utils'
  ? { cn: (...values) => require('tailwind-merge').twMerge(require('clsx').clsx(values)) }
  : name === 'lucide-react' ? { Loader: props => React.createElement('svg', props) } : localRequire(name), exportsObject);
const { Badge } = exportsObject;
const markup = renderToStaticMarkup(React.createElement(Badge, { maxWidth: 120, color: 'notice', icon: React.createElement('svg') }, React.createElement('span', null, 'Long status label')));
assert.match(markup, /title="Long status label"/);
assert.match(markup, /max-width:120px/);
assert.match(markup, /bg-badge-notice/);
assert.match(markup, /shrink-0/);
assert.match(markup, /min-w-0 truncate/);
const override = renderToStaticMarkup(React.createElement(Badge, { maxWidth: '100%', title: 'Full accessible label' }, 'Short'));
assert.match(override, /title="Full accessible label"/);
const normal = renderToStaticMarkup(React.createElement(Badge, null, 'Neutral'));
assert.match(normal, /bg-badge-neutral/);
assert.doesNotMatch(normal, /title=/);
console.log('Badge truncation, tooltip, icon, and color checks passed');
