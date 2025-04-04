---
title: "Setting Up Defensio Anti-spam in Wordpress"
date: 2013-11-11T12:00:00+00:00
tags: ["wordpress", "seo"]
---

After installing "All in One SEO" pack, getting Google Analytics set up, and registering my site with Google Webmaster Tools and Bing Webmaster Tools (and Pinterest), the next thing to do is install the "Defensio Anti-spam" plugin in Wordpress. This involves getting a free account with Defensio, which is where we'll start, and installing the plugin and then confirming the API key within the plugin.

## Defensio Account

- Go to [Defensio Anti-spam](http://www.defensio.com) and set up a new account.
- Click on "My API Keys" and select "Protect another web property".
- Choose "Protect a Blog or Website".
- Enter your site's URL and click Submit.
- Copy your API key to the clipboard.

## Install the Plugin

- Go back to your site's WordPress Dashboard and select Plugins > Add New.
- Search for "Defensio".
- Select "Defensio Anti-Spam" and click on "Install Now" and confirm in the dialog.
- Click on Activate Plugin.
- You'll see a message that says "**Defensio is not active** because you have not entered your Defensio API key. [Get one right here!](http://defensio.com/signup)" You've already got an API key, so go to the left hand menu. Select Plugins > Defensio Configuration
- Click "Save Settings", leaving all the other options alone.
- You should get a message saying that your API key is valid.

Now that the plugin is installed, you'll see an extra menu item under Comments for "Defensio Spam" where you can confirm or release comments that are identified as spam. 