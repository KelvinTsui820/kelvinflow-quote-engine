const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'review.html'), 'utf8');

// Extract the script tag that contains Vue logic
const lastScriptIdx = html.lastIndexOf('<script>');
const endScriptIdx = html.lastIndexOf('</script>');
const scriptCode = html.substring(lastScriptIdx + 8, endScriptIdx);

// Load Vue
const vueCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'vue.global.prod.js'), 'utf8');

const localStorageData = {
  saas_auth_token: 'mock_token_abc',
  kelvinflow_user_phone: '13800138000',
  kelvinflow_user_plan: 'trial',
  kelvinflow_user_is_paid: 'false'
};

const createMockEl = (tag = 'div') => ({
  tagName: tag.toUpperCase(),
  nodeType: 1,
  attributes: {},
  children: [],
  style: {},
  classList: { add: () => {}, remove: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
  setAttribute: () => {},
  getAttribute: () => null,
  appendChild: () => {},
  removeChild: () => {},
  insertBefore: () => {},
  getBoundingClientRect: () => ({
    top: 20,
    left: 10,
    right: 100,
    bottom: 50,
    width: 90,
    height: 30
  })
});

const mockAppEl = createMockEl('div');
mockAppEl.id = 'app';

const mockDocument = {
  nodeType: 9,
  createElement: (tag) => createMockEl(tag),
  createElementNS: (ns, tag) => createMockEl(tag),
  createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  createComment: (text) => ({ nodeType: 8, textContent: text }),
  querySelector: (sel) => sel === '#app' ? mockAppEl : createMockEl('div'),
  querySelectorAll: () => [],
  getElementById: (id) => createMockEl('div')
};

class SVGElement {}
class Element {}
class HTMLElement extends Element {}

const sandbox = {
  console,
  SVGElement,
  Element,
  HTMLElement,
  Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 },
  setTimeout: (fn, ms) => {
    // Run synchronously for testing
    return fn();
  },
  clearTimeout: () => {},
  setInterval: () => 123,
  clearInterval: () => {},
  localStorage: {
    getItem: (k) => localStorageData[k] || null,
    setItem: (k, v) => { localStorageData[k] = String(v); },
    removeItem: (k) => { delete localStorageData[k]; }
  },
  window: {
    location: {
      pathname: '/review/QT-20260904-888',
      search: '?tour=1&token=mock_token_abc',
      href: 'http://localhost:3000/review/QT-20260904-888?tour=1&token=mock_token_abc'
    },
    innerWidth: 375,
    innerHeight: 812,
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  document: mockDocument,
  URLSearchParams: require('url').URLSearchParams,
  fetch: async (url) => {
    return {
      json: async () => ({
        success: true,
        quotation: {
          quotationNumber: 'QT-20260904-888',
          items: []
        },
        tenant: {
          companyName: 'Test Tenant',
          plan: 'trial'
        }
      })
    };
  },
  navigator: {
    clipboard: {
      writeText: async () => {}
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(vueCode, sandbox);

console.log('Testing actual review.html file directly...');

try {
  vm.runInContext(scriptCode, sandbox);
  console.log('✅ Actual review.html file executed 100% successfully without throwing!');
} catch (err) {
  console.error('❌ Actual review.html file failed with error:', err);
  process.exit(1);
}
