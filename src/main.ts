import { Devvit } from "@devvit/public-api";
import { getParagraphCounts, getParagraphTotals } from "./html2.js";

Devvit.configure({
  redditAPI: true,
});
const defaultValue = 'please make sure to properly format your post and add paragraphs.\n\nif you dont know how just add 2 newlines every once in a while';

Devvit.addSettings([
  {
    type: 'group',
    "label": "Checks",
    fields: [
      {
        type: "number",
        name: "maxCharactersPerParagraph",
        label: 'max characters per paragraph',
        helpText: '0 for unlimited',
        onValidate: validateRangeInt('max characters per paragraph', 0, Infinity),
        defaultValue: 600,
      },
      {
        type: "number",
        name: "maxWordsPerParagraph",
        label: 'max words per paragraph',
        helpText: '0 for unlimited',
        onValidate: validateRangeInt('max words per paragraph', 0, Infinity),
        defaultValue: 200,
      },
    ]
  },
  {
    type: 'group',
    label: "Action",
    fields: [
      {
        type: "select",
        name: "action",
        label: 'Action to take',
        options: [
          { label: 'Report', value: 'report' },
          { label: 'Remove', value: 'remove' },
          { label: 'Comment', value: 'comment' },
          { label: 'Lock', value: 'lock' },
        ], defaultValue: ['report'],
        multiSelect: true,
      },
      {
        type: "string",
        name: "report_reason",
        label: 'Report Reason',
        onValidate: validateStringRange('Report Reason', 3, 70),
        defaultValue: 'user\'s post doesnt meet the text requirements'
      },
      {
        type: "paragraph",
        name: "comment_body",
        label: 'Comment Body',
        onValidate: validateStringRange('Comment Body', 15, 10000),
        defaultValue,
      },
      {
        type: "boolean",
        name: "lockown",
        label: 'Lock own comment',
        defaultValue: true,
      },
      {
        type: "boolean",
        name: "sticky",
        label: 'Sticky own comment',
        defaultValue: true,
      },
    ]
  }
]);

Devvit.addTrigger({
  events: ['PostCreate', 'PostUpdate'],// , 'CommentCreate', 'CommentUpdate'
  async onEvent(event, context) {
    const id = event.post?.id;
    if (id) {
      const post = await context.reddit.getPostById(id), html = post.bodyHtml || '';
      const conf = {
        maxWordsPerParagraph: (await context.settings.get<number>('maxWordsPerParagraph')) || Infinity,
        maxCharactersPerParagraph: (await context.settings.get<number>('maxCharactersPerParagraph')) || Infinity,
      }, p = getParagraphCounts(html), exceeded = p.some(p => p.words > conf.maxWordsPerParagraph ||
        p.characters > conf.maxCharactersPerParagraph);
      //; exceeded = exceedsParagraphLimits(html, conf);
      if (exceeded) {
        const actions = (await context.settings.get<string[]>('action')) ?? [];
        if (actions.includes('comment')) {
          const text = (await context.settings.get<string>('comment_body')) || defaultValue,
            comment = await context.reddit.submitComment({ id, text });

          await comment.distinguish(await context.settings.get<boolean>('sticky'));
          if (await context.settings.get<boolean>('lockown')) await comment.lock();
        }
        if (actions.includes('lock')) {
          await post.lock();
        }
        if (actions.includes('remove')) {
          await context.reddit.remove(id, false);
        } else if (actions.includes('report')) {
          const maxCharacters = Math.max(...p.map(p => p.characters)), maxWords = Math.max(...p.map(p => p.words));
          const reason = `u/${context.appName} (letters=${maxCharacters}, words=${maxWords}): ` + (await context.settings.get<string>('report_reason'));
          // @ts-expect-error
          await context.reddit.report(event.post, { reason });
        }
      }
    }
  },
});

Devvit.addMenuItem({
  location: 'post',
  label: "Evaulate Post",
  description: 'u/parawall-block',
  async onPress(event, context) {
    const post = await context.reddit.getPostById(event.targetId), html = post.bodyHtml || '';
    const p = getParagraphCounts(html), paragraphCounts = p.length;
    const maxCharacters = Math.max(...p.map(p => p.characters)), maxWords = Math.max(...p.map(p => p.words));
    context.ui.showToast(`u/${context.appName} (letters=${maxCharacters}, words=${maxWords}, paragraphs=${paragraphCounts})`);
  },
});

export default Devvit;
function validateStringRange(_label: string, min: number, max: number) {
  return function ({ value }: { value: string | undefined }) {
    const len = BigInt(value?.length || 0);
    if (len < min) return `${RangeError('Character count must be more than ' + min)}`;
    if (len > max) return `${RangeError('Character count must be less than ' + max)}`;
  } as ({ value }: { value: string | undefined }) => string | undefined;;
}

function validateRangeInt(variable: string, minInclusive: number, maxInclusive: number, allow0: boolean = false) {
  return function ({ value }: { value: number | undefined }) {
    try {
      // @ts-expect-error
      const b = BigInt(value); if (allow0) if (b === 0n) return undefined;
      if (b < minInclusive) throw RangeError(`${variable} must be greater than ${minInclusive}, received ${b}`);
      if (b > maxInclusive) throw RangeError(`${variable} must be less than ${maxInclusive}, received ${b}`);
    } catch (err) {
      return String(err);
    } return undefined;
  } as ({ value }: { value: number | undefined }) => string | undefined;
}
