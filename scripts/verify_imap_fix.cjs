const fs = require('fs');
let content = fs.readFileSync('public/review.html', 'utf8');

const oldChunk = `            <button @click="saveImapConfig" :disabled="imapModal.saving || !imapModal.email || !imapModal.authCode"
                    class="flex-1 h-10 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer">
              <i v-if="imapModal.saving" class="fa-solid fa-spinner animate-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              <span>{{ imapModal.saving ? '保存中...' : '保存并激活草稿直达' }}</span>
            </button>
          </div>
        </div>

        <!-- 弹窗底栏 (固定贴底，受外层 overflow-hidden 保护，彻底消除滚动条破角) -->
        <div class="p-3 px-5 sm:px-6 bg-slate-50/90 border-t border-slate-100 flex justify-between items-center text-xs flex-shrink-0">
          <span class="text-[11px] text-slate-400 flex items-center">
            <i class="fa-solid fa-shield-halved text-emerald-500 mr-1.5"></i>
            单向静默写入草稿箱，绝不读取您的个人邮件隐私
          </span>
          <button @click="imapModal.show = false" class="text-xs font-bold text-slate-500 hover:text-slate-700 px-3.5 py-1.5 hover:bg-slate-200/60 rounded-xl transition cursor-pointer">
            关闭
          </button>
        </div>
      </div>
    </div>`;

const newChunk = `            <button @click="saveImapConfig" :disabled="imapModal.saving || !imapModal.email || !imapModal.authCode"
                    class="flex-1 h-10 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer">
              <i v-if="imapModal.saving" class="fa-solid fa-spinner animate-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              <span>{{ imapModal.saving ? '保存中...' : '保存并激活草稿直达' }}</span>
            </button>
          </div>
        </div>
        </div>

        <!-- 弹窗底栏 (固定贴底，受外层 overflow-hidden 保护，彻底消除滚动条破角) -->
        <div class="p-3 px-5 sm:px-6 bg-slate-50/90 border-t border-slate-100 flex justify-between items-center text-xs flex-shrink-0">
          <span class="text-[11px] text-slate-400 flex items-center">
            <i class="fa-solid fa-shield-halved text-emerald-500 mr-1.5"></i>
            单向静默写入草稿箱，绝不读取您的个人邮件隐私
          </span>
          <button @click="imapModal.show = false" class="text-xs font-bold text-slate-500 hover:text-slate-700 px-3.5 py-1.5 hover:bg-slate-200/60 rounded-xl transition cursor-pointer">
            关闭
          </button>
        </div>
      </div>
    </div>
    </div>`;

const testContent = content.replace(oldChunk, newChunk);
const lines = testContent.split('\n');

const appStart = lines.findIndex(l => l.includes('id="app"'));
const scriptStart = lines.findIndex(l => l.includes('<script>'));

let stack = [];
for (let i = appStart; i < scriptStart; i++) {
  const line = lines[i];
  const regex = /<\/?div(\s+[^>]*)?>/g;
  let m;
  while ((m = regex.exec(line)) !== null) {
    if (m[0].startsWith('</')) {
      if (stack.length === 0) {
        console.log('Error: popped empty stack at line', i + 1);
      } else {
        stack.pop();
        if (stack.length === 0) {
          console.log('Stack hit 0 at line', i + 1, ':', line.trim());
        }
      }
    } else if (!m[0].endsWith('/>')) {
      stack.push({ line: i + 1, text: line.trim().slice(0, 40) });
    }
  }
}

console.log('At <script>, remaining open divs in entire template:', stack.length);
