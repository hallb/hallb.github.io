---
layout: post
title:  "Setting up All In One SEO Pack"
date:   2013-11-08 12:00:00 +0000
keywords: wordpress, seo
---
WordPress has a freely available plugin called "All in One SEO Pack". This plugin helps with SEO good practices like:
<ul>
    <li>hooking your site up to Google Webmaster Tools, Bing Webmaster Tools, and registering with Pinterest;</li>
    <li>setting up Google Analytics;</li>
    <li>creating a sitemap.xml;</li>
    <li>referring to your Google+ account.</li>
</ul>
Here are the steps I've used to set up "All in One SEO Pack" v2.0.4.1 on my latest site running on a self-hosting install of WordPress 3.7.1. Bear in mind that the Google and Bing webmaster instructions were good as of the date that I wrote this.
<ul>
    <li>Log in as an administrator and select Plugins &gt; Add New which takes you to the Install Plugins screen.</li>
    <li>Search for "All in One SEO Pack" which should be the first result.</li>
    <li>Click Install Now and then OK.</li>
    <li>On the screen labelled "Installing Plugin: All in One SEO Pack 2.0.4.1", click "Activate Plugin".</li>
    <li>In the top of the left-side menu towards, you should have a new entry called "All in One SEO". Click on it.</li>
    <li>You can dismiss the helpful "Welcome" and "Review Your Settings" pop-ups by clicking "Dismiss" in each one</li>
</ul>
We'll start off with the General Settings:
<ul>
    <li>In "Home Page Settings", set your Home Title, Home Description, and Home Keywords. These will controls the settings only your home page. Choosing well here is important, but is beyond my to give good advice on. Don't worry too much--these can be updated later.</li>
    <li>In "Keyword Settings":
<ul>
    <li>Leave "Use Keywords" enabled.</li>
    <li>Turn on "Use Categories for META Keywords".</li>
    <li>Leave "Use Tags for META Keywords" enabled.</li>
    <li>Leave "Dynamically generate Keywords for Posts pages" enabled.</li>
</ul>
</li>
    <li>Leave all the "Title Settings" as-is.</li>
    <li>Leave "Custom Site Post Settings" as-is.</li>
    <li>Leave "Display Settings" as-is.</li>
    <li>Leave the "Noindex Settings" and "Advanced Settings" (at the bottom of the page) as they are.</li>
</ul>
At this point, use the "Update Options" button at the bottom and then scroll back down to the settings for "Webmaster Verification."

<strong>Google Webmaster Tools</strong>
<ul>
    <li>In a new browser tab, go to <a title="Google Webmaster Tools" href="https://www.google.com/webmasters/tools">Google Webmaster Tools</a>, using your Google Account.</li>
    <li>Click on "ADD A SITE".</li>
    <li>Enter the URL of your site and click "Continue".</li>
    <li>Click on the "Alternate Methods" tab and select HTML Tag.</li>
    <li>Copy the value of the content attribute.</li>
    <li>Go back to your, "All in One SEO Pack" panel in WordPress and paste the value you copied into the text field labeled "Google Webmaster Tools", and use the "Update Options" button at the bottom.</li>
    <li>Once WordPress has finished saving the settings, return to your Google Webmaster Tools browser tab, and press the "Verify" button.</li>
    <li>You should get a message that says "Congratulations, you have successfully verified your ownership of <strong>URL.</strong>" Click Continue.</li>
</ul>
<strong>Google Analytics and Miscellaneous Google Settings in WordPress
</strong>
<ul>
    <li>Next we'll deal with Google Analytics. In another browser tab, go to <a title="Google Analytics" href="http://www.google.com/analytics/">Google Analytics</a>. Click on "Access Google Analytics".</li>
    <li>Click on "Admin" on the right hand side of the menu bar.</li>
    <li>In the "Account" drop down on the left, choose "Create New Account".</li>
    <li>Leave the selection as "Universal Analytics"</li>
    <li>Enter your website's domain name as the "Account Name" and "Website Name" and "Website URL". You can make this more complicated if you anticipate multiple "properties" within the account, but this should suffice as the simplest option.</li>
    <li>Choose an appropriate "Industry Category". I'm not sure how significant this is yet.</li>
    <li>Choose an appropriate "Reporting Time Zone"</li>
    <li>Leave all the data sharing options on.</li>
    <li>Click on the "Get Tracking ID" button, and accept the Terms and Conditions for your country.</li>
    <li>Near the top of the next page, you'll see your "Tracking ID". All the IDs I've seen so far start with "UA" presumably for "Universal Analytics". Copy the tracking id to your clipboard. Go back to the WordPress "All in One SEO Pack" "General Settings" page, scroll down to the "Google Settings" section and paste your tracking id into "Google Analytics ID".</li>
    <li>For the rest of the Google Settings:
<ul>
    <li>If you want to associate this site entry on a Search Engine Results Page with your Google+ account, copy the URL from your profile page and paste it here. It wasn't obvious to me which URL to use, so I've used <a title="Ben Hall's Google Plus Profile URL" href="https://plus.google.com/101644096156982718770/">https://plus.google.com/101644096156982718770/ </a>which I got by logging into Google+, selecting my "Profile" and copying the URL but trimming the word "posts" from the end. You might not want to do this if this is a corporate or product WordPress site, or you might want to create a Google+ account for your corporation or product.</li>
    <li>Turn on "Use Universal Analytics"</li>
    <li>Unless you know what it means, leave "Tracking Domain" and "Track Multiple Domains" alone.</li>
    <li>Turn on "Track Outbound Links" so you know where your Audience is heading when they leave your site.</li>
</ul>
</li>
    <li>Click "Update Options" at the bottom of the page.</li>
    <li>Next we'll link your Google Analytics account to your Google Webmaster Tools entry. You do this to expose data from one tool in the views of the other.
<ul>
    <li>Return to your "Google Analytics" browser tab and select "Property Settings" from the left hand menu.</li>
    <li>Near the bottom of the "Property Settings" page, find "Webmaster Tools Settings" and click edit. This will open a new tab for "Enable Webmaster Tools data in Google Analytics" in Google Webmaster Tools.</li>
    <li>Click the radio button next to your site's entry and click "Save" and "OK" on the "Save Association" confirmation dialog. This will take you back to Google Analytics.</li>
</ul>
</li>
</ul>
<strong>Google Sitemap</strong>
<ul>
    <li>Next, we'll set up your sitemap on Google.</li>
    <li>First you have to enable permalinks in your WordPress settings.
<ul>
    <li>On the left side menu in the WordPress Dashboard, select "Settings" and then "Permalinks" near the bottom.</li>
    <li>Select a setting that will put the post name in the URL. Personally, I prefer the "Day and name" style.</li>
    <li>Click "Save Changes"</li>
</ul>
</li>
    <li>From the left side menu in the WordPress Dashboard, select "Feature Manager" under "All in One SEO Pack"</li>
    <li>Under "XML Sitemaps", click "Activate"</li>
    <li>There will now be a new entry in the left side menu in the WordPress Dashboard called "XML Sitemap". Click on it.</li>
    <li>Turn on "Notify Google" and "Notify Bing"</li>
    <li>Leave all the other settings as-is and click "Update Sitemap"</li>
    <li>Return to your "Google Webmaster Tools" browser tab.</li>
    <li>Select "Crawl" and then "Sitemaps"</li>
    <li>Click "Add/Test Sitemap" and type in "sitemap.xml", assuming you didn't change the name of the file in "XML Sitemap" setting earlier.</li>
    <li>Click "Submit Sitemap"</li>
    <li>Wait a little while (less than a minute) and select "Crawl" and then "Sitemaps" and you should see that your sitemap has been submitted, but not yet indexed.</li>
</ul>
<strong>Bing Webmaster Center</strong>
<ul>
    <li>In a new browser tab, go to <a title="Bing Webmaster Tools" href="http://www.bing.com/toolbox/webmaster">Bing Webmaster Center</a> and log in with your Microsoft Account (sigh...I'm glad I've started using KeePassX as my password manager).</li>
    <li>Under My Sites, enter the URL of your WordPress site and then click "Add"</li>
    <li>On the next page, enter the URL for your sitemap, which will be http://yourdomain.com/sitemap.xml.</li>
    <li>Click "Add"</li>
    <li>Next we verify to Bing that you are the webmaster for your blog. On the next page, copy the value of the "content" attribute in the Option 2 HTML snippets.</li>
    <li>Return to your WordPress browser tab, and select "All in One SEO", "General Settings", scroll down to the field for Bing Webmaster Center, and paste the value there.</li>
    <li>Scroll to the bottom of the page, and click "Update Options"</li>
    <li>Return to your Bing "Verify Ownership" browser tab, and press the "Verify" button at the bottom.</li>
</ul>
&nbsp;

<strong>Pinterest</strong>
<ul>
    <li> Go through the Pinterest process (which is similar to the Bing and Google processes). Your first choice is whether to register your personal account with Pinterest or a business account. Unlike Google and Bing, each account can only have a single web property associated with it. Personally, I've only set up a single <a title="Ben Hall Pinterest Page" href="https://www.pinterest.com/benedicthall/">Pinterest account for my benhall.ca site</a>. Look for a subsequent post about setting up a business account.</li>
</ul>
&nbsp;