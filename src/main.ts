import { Devvit } from "@devvit/public-api";
import { parseHTMLMD } from "./html3.js";

Devvit.configure({
  redditAPI: true,
});
const defaultValue = 'please make sure to properly format your post and add paragraphs.\n\n' +
  'if you dont know how just add 2 newlines every once in a while\n\n' +
  'you currently have {current-words} words in your longest paragraph where {limit-words} are allowed.  \nyou also '
  + 'have {current-chars} characters at most in any of your paragraphs where only {limit-chars} are allowed.';

Devvit.addSettings([
  {
    type: 'group',
    label: "Paragraphs",
    fields: [
      {
        type: "boolean",
        name: "enabled",
        label: 'Enabled',
        defaultValue: true,
      },
      {
        type: 'group',
        label: "Checks",
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
            helpText: 'placeholders supported. the placeholders available are in the readme',
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
    ]
  },
  {
    type: 'group',
    label: "Links",
    fields: [
      {
        type: "boolean",
        name: "enabled-BannedDomains",
        label: 'Enabled',
        defaultValue: false,
      },
      {
        type: 'group',
        label: "Checks",
        fields: [
          {
            type: "paragraph",
            name: "BannedDomains",
            label: 'domains to take action on',
            helpText: 'space or comma or pipe ("|") seperated. domains only (reddit.com instead of https://reddit.com)',
            onValidate({ value }) {
              const domains = value?.split(/[|,\s]+/g);
              if (!domains?.length) return undefined;
              for (let domain of domains) {
                if (domain === '') continue;
                if (!URL.canParse(`https://${domain}/`)) {
                  return `${TypeError(`"${domain}" is not a valid domain`)}`;
                }
              }
            },
          },
          {
            type: "boolean",
            name: "nolink-BannedDomains",
            label: 'Flag All HyperLinks',
            defaultValue: false,
          },
        ]
      },
      {
        type: 'group',
        label: "Action",
        fields: [
          {
            type: "select",
            name: "action-BannedDomains",
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
            name: "report_reason-BannedDomains",
            label: 'Report Reason',
            onValidate: validateStringRange('Report Reason', 3, 70),
            defaultValue: 'user used a banned domains',
          },
          {
            type: "paragraph",
            name: "comment_body-BannedDomains",
            label: 'Comment Body',
            onValidate: validateStringRange('Comment Body', 15, 10000),
            defaultValue: 'please do not use that domain',
          },
          {
            type: "boolean",
            name: "lockown-BannedDomains",
            label: 'Lock own comment',
            defaultValue: true,
          },
          {
            type: "boolean",
            name: "sticky-BannedDomains",
            label: 'Sticky own comment',
            defaultValue: true,
          },
        ]
      }
    ]
  }
]);

function insertionReplacer(string: string,
  currentChars: number, currentWords: number,
  limitChars: number, limitWords: number): string {
  return `${string}`.replaceAll(/\{(current|limit)-(char|word)(s?)}/ig, function
    (_: string, currLimit_: string, charWords_: string, plural: string): string {
    const currLimit = currLimit_.toLowerCase(), charWords = charWords_.toLowerCase();
    if (currLimit === 'current') {
      if (charWords === 'char') {
        return `${currentChars}`;
      } else if (charWords === 'word') {
        return `${currentWords}`;
      }
    } else if (currLimit === 'limit') {
      if (charWords === 'char') {
        return `${limitChars}`;
      } else if (charWords === 'word') {
        return `${limitWords}`;
      }
    }
    return `{${currLimit_}-${charWords_}${plural}}`;
  });
}

Devvit.addTrigger({
  events: ['PostCreate', 'PostUpdate'],
  async onEvent(event, context) {
    const id = event.post?.id;
    if (id) {
      const post = await context.reddit.getPostById(id), html = post.bodyHtml || '';
      const conf = {
        maxWordsPerParagraph: (await context.settings.get<number>('maxWordsPerParagraph')) || Infinity,
        maxCharactersPerParagraph: (await context.settings.get<number>('maxCharactersPerParagraph')) || Infinity,
      }, { paragraphs, hrefs } = parseHTMLMD(html, 'https://reddit.com'), p = paragraphs,
        exceeded = p.some(p => p.words > conf.maxWordsPerParagraph
          || p.characters > conf.maxCharactersPerParagraph);

      // exceeding paragraphs
      if (exceeded && (await context.settings.get<boolean>('enabled'))) {
        const actions = (await context.settings.get<string[]>('action')) ?? [];
        const maxCharacters = Math.max(...p.map(p => p.characters)), maxWords = Math.max(...p.map(p => p.words));

        if (actions.includes('comment')) {
          const text = insertionReplacer((await context.settings.get<string>('comment_body')) || defaultValue,
            maxCharacters, maxWords, conf.maxCharactersPerParagraph, conf.maxWordsPerParagraph),
            comment = await context.reddit.submitComment({ id, text });

          await comment.distinguish(await context.settings.get<boolean>('sticky'));
          if (await context.settings.get<boolean>('lockown')) await comment.lock();
        }

        if (actions.includes('lock')) await post.lock();
        if (actions.includes('remove')) {
          await context.reddit.remove(id, false);
        } else if (actions.includes('report')) {
          const reason = `u/${context.appName} (letters=${maxCharacters}, words=${maxWords}): `
            + (await context.settings.get<string>('report_reason'));
          // @ts-expect-error
          await context.reddit.report(event.post, { reason });
        }
      }

      if (await context.settings.get<boolean>('enabled-BannedDomains')) {
        const postFix = '-BannedDomains', hostnames = hrefs.map(url => url.hostname);
        const BannedDomains = ((await context.settings.get<string>('BannedDomains')) ?? '').split(/[|,\s]+/g);
        let isBanned = await context.settings.get<boolean>('nolink' + postFix);

        if (!isBanned) isBanned = BannedDomains.some(banned => hostnames.some(user => {
          const lowerUser = user.toLowerCase(),
            lowerBanned = banned.toLowerCase();

          return lowerUser === lowerBanned || lowerUser.endsWith('.' + lowerBanned);
        }));

        if (isBanned) {
          const actions = (await context.settings.get<string[]>('action' + postFix)) ?? [];
          if (actions.includes('comment')) {
            const text = (await context.settings.get<string>('comment_body' + postFix)) || defaultValue,
              comment = await context.reddit.submitComment({ id, text });

            await comment.distinguish(await context.settings.get<boolean>('sticky' + postFix));
            if (await context.settings.get<boolean>('lockown' + postFix)) await comment.lock();
          }
          if (actions.includes('lock')) await post.lock();
          if (actions.includes('remove')) {
            await context.reddit.remove(id, false);
          } else if (actions.includes('report')) {
            const reason = `u/${context.appName}: `
              + (await context.settings.get<string>('report_reason' + postFix));
            // @ts-expect-error
            await context.reddit.report(event.post, { reason });
          }
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
    const { paragraphs } = parseHTMLMD(html), p = paragraphs, paragraphCounts = p.length;
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
