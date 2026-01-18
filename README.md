# u/parawall-block

u/parawall-block can report or remove long posts with single paragraphs also known as "text walls".

you can configure the 'max characters per paragraph' and 'max words per paragraph' in the mod settings.

when a detection is detected you can set the bot to

- lock the post.
- remove the post
- report the post
- have the bot comment on the post

or a combination of them. if you add remove then no repport will happen.

## placeholders

| placeholder | replaced with |
|:------------|:--------------|
| `{limit-words}` | the number of words max per paragraph |
| `{limit-chars}` | the number of characters max per paragraph |
| `{current-words}` | the number of the most words in any paragraph |
| `{current-chars}` | the number of the most characters in any paragraph |

case-insensitive

## changelog

### 0.0.9: placeholder support

- you can now set placeholders by putting the ones above in your text.
  only one textfield supports them.
- default value of said textbox updated. uninstall and then install the app to make it update.
  you will lose your settings if you do that

### 0.0.8

- fixed the empty domain error

### 0.0.7

- added link support
  - if its not hyperlinked on reddit then it doesnt work

### 0.0.6

- added a menu item to count paragraphs, the most words in those paragraphs, and the most characters in any of those paragraphs
- added the count of the most words in those paragraphs, and the most characters in any of those paragraphs.

### 0.0.4

- fixed the issue where "`RangeError: 0 must be greater than Infinity, received 0`"
- yes someone has actually reported that

## u/parawall-block's socials

[u/parawall-block (devvit)](https://developers.reddit.com/apps/parawall-block),
[github](https://github.com/DNSCond/parawall-block)
