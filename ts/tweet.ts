class Tweet {
    private text: string;
    time: Date;

    constructor(tweet_text: string, tweet_time: string) {
        this.text = tweet_text;
        this.time = new Date(tweet_time);
    }

    get source(): string {
        // Check the specific sharing templates before treating a tweet as discussion.
        if (/\bwatch my\b.*\bright now\b/i.test(this.text)) {
            return "live_event";
        }
        if (/\bachieved a new personal record\b|\bi just set a goal\b/i.test(this.text)) {
            return "achievement";
        }
        if (/\b(?:just\s+)?(?:completed|posted)\s+(?:a|an)\s+|\bi just ran with\b/i.test(this.text)) {
            return "completed_event";
        }
        return "miscellaneous";
    }

    // Preserve multiword activity names and handle both distance and duration logs.
    private get completedActivity(): { activity: string; miles: number; template: string } | null {
        const distanceMatch = this.text.match(/\b(?:i\s+)?(?:just\s+)?(?:completed|posted)\s+(?:a|an)\s+(\d+(?:[.,]\d+)?)\s*(mi|km)\b\s+(.+?)(?=\s+(?:with\b|in\b)|\s+[-–—@]|\s+https?:\/\/|\s+#|$)/i);
        if (distanceMatch) {
            const distance = Number(distanceMatch[1].replace(",", "."));
            return {
                activity: distanceMatch[3].trim().toLowerCase(),
                miles: distanceMatch[2].toLowerCase() === "km" ? distance / 1.609344 : distance,
                template: distanceMatch[0]
            };
        }
        const durationMatch = this.text.match(/\b(?:i\s+)?(?:just\s+)?(?:completed|posted)\s+(?:a|an)\s+(.+?)\s+in\s+(?:\d+:){1,2}\d+(?:\.\d+)?/i);
        if (durationMatch) {
            return { activity: durationMatch[1].trim().toLowerCase(), miles: 0, template: durationMatch[0] };
        }
        return null;
    }

    get written(): boolean {
        return this.writtenText.length > 0;
    }

    get writtenText(): string {
        let content = this.text;
        const activity = this.completedActivity;
        if (this.source === "completed_event" && activity) {
            content = content.replace(activity.template, "");
        }
        // Remove app-generated sharing text, links, and automatic hashtags only.
        content = content
            .replace(/\bwatch my\b.*?\bright now with @?runkeeper live\b/gi, "")
            .replace(/\bachieved a new personal record with #runkeeper:\s*[^\n]*?(?=https?:\/\/|$)/gi, "")
            .replace(/\bi just set a goal on #runkeeper!\s*[^\n]*?(?=https?:\/\/|$)/gi, "")
            .replace(/\bi just (?:ran|completed an activity) with [#@]?runkeeper\b/gi, "")
            .replace(/\bwith @?runkeeper\b\.?/gi, "")
            .replace(/\bcheck it out!/gi, "")
            .replace(/\btomtom mysports watch\b/gi, "")
            .replace(/https?:\/\/\S+/gi, "")
            .replace(/#(?:runkeeper|rklive|fitnessalerts)\b/gi, "")
            .replace(/\s+/g, " ")
            .replace(/^[\s\-–—.,!?:;'"‘’“”…]+|[\s\-–—.,!?:;'"‘’“”…]+$/g, "");
        return content.trim();
    }

    get activityType(): string {
        if (this.source !== "completed_event") {
            return "unknown";
        }
        const activity = this.completedActivity;
        if (activity) {
            return activity.activity;
        }
        return /\bi just ran with\b/i.test(this.text) ? "run" : "unknown";
    }

    // Zero means there is no parsed distance, including duration-only activities.
    get distance(): number {
        if (this.source !== "completed_event") {
            return 0;
        }
        const activity = this.completedActivity;
        return activity ? activity.miles : 0;
    }

    private escapeHTML(value: string): string {
        return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    getHTMLTableRow(rowNumber: number): string {
        // Escape tweet text before adding link markup so it cannot become HTML.
        const linkPattern = /https?:\/\/[^\s<>"']+/gi;
        let linkedText = "";
        let cursor = 0;
        let match: RegExpExecArray | null;
        while ((match = linkPattern.exec(this.text)) !== null) {
            const url = match[0].replace(/[.,!?;)\]]+$/, "");
            linkedText += this.escapeHTML(this.text.slice(cursor, match.index));
            linkedText += '<a href="' + this.escapeHTML(url) + '" target="_blank" rel="noopener noreferrer">' + this.escapeHTML(url) + '</a>';
            cursor = match.index + url.length;
        }
        linkedText += this.escapeHTML(this.text.slice(cursor));
        return '<tr><td>' + rowNumber + '</td><td>' + this.escapeHTML(this.activityType) + '</td><td>' + linkedText + '</td></tr>';
    }
}
