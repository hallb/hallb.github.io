---
layout: post
title:  "Setting Up Defensio Anti-spam in Wordpress"
date:   2013-11-11 12:00:00 +0000
keywords: wordpress, seo
---
After installing "All in One SEO" pack, getting Google Analytics set up, and registering my site with Google Webmaster Tools and Bing Webmaster Tools (and Pinterest), the next thing to do is install the "Defensio Anti-spam" plugin in Wordpress. This involves getting a free account with Defensio, which is where we'll start, and installing the plugin and then confirming the API key within the plugin.

## Defensio Account

<ul>
	<li>Go to <a title="Defensio Anti-spam" href="http://www.defensio.com">http://www.defensio.com</a> and set up a new account.</li>
	<li>Click on "My API Keys" and select "Protect another web property".</li>
	<li>Choose "Protect a Blog or Website".</li>
	<li>Enter your site's URL and click Submit.</li>
	<li>Copy your API key to the clipboard.</li>
</ul>

## Install the Plugin

<ul>
	<li>Go back to your site's WordPress Dashboard and select Plugins &gt; Add New.</li>
	<li>Search for "Defensio".</li>
	<li>Select "Defensio Anti-Spam" and click on "Install Now" and confirm in the dialog.</li>
	<li>Click on Activate Plugin.</li>
	<li>You'll see a message that says "<strong>Defensio is not active</strong> because you have not entered your Defensio API key. <a href="http://defensio.com/signup" target="_blank">Get one right here!</a>" You've already got an API key, so go to the left hand menu. Select Plugins &gt; Defensio Configuration</li>
	<li>Click "Save Settings", leaving all the other options alone.</li>
	<li>You should get a message saying that your API key is valid.</li>
</ul>

Now that the plugin is installed, you'll see an extra menu item under Comments for "Defensio Spam" where you can confirm or release comments that are identified as spam.