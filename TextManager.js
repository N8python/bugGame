import localProxy from "./localProxy.js";
const script = {
    "Introduction": `Dear AGENT REPPOH,

    Armies of insects have invaded the KRAM II’s systems. The survival of the KRAM II, our most powerful computer, is vital to our university. You, AGENT, have been tasked with expunging this insect scourge, and restoring all switches and machinery that these foul beasts have disabled. We have provided you with a powerful weapon: The COBOLT. Use it well. We wish you the best of luck.
    
    KILL ALL INSECTS.
    
    FLIP ALL LEVERS.
    
    CLEANSE ALL TUBES.
    
    Sincerely,
    DRAVRAH UNIVERSITY
    `,
    "Tutorial": `Dear AGENT REPPOH,

    It has come to our attention that you may have difficulty adjusting to your new environment, as your size has been temporarily reduced to accommodate the circuits and tubes of the KRAM II. We therefore provide you with guidance on how to maneuver about your new surroundings.
    
    Use the mouse to look around.
    
    Use WASD to move around.
    
    Click to attack.
    Right click to block.
    Shift click to do a quick attack or interact.
    
    Interact or click levers to flip them.
    
    You are additionally provided with a station. This device displays the amount of insects remaining and the amount of levers you have pressed.
    
    Once all levers are pressed and all insects killed, interact/click with your station to progress to the next level.
    
    Hopefully these suggestions allow you to complete your mission.
    
    Sincerely,
    DRAVRAH UNIVERSITY
    `,
    "Pascaliber": `Dear AGENT REPPOH,

    The threat level posed by insects has dramatically increased. The infestation is worse than we thought in lower parts of the KRAM II. We have now equipped you, AGENT, with a dangerous weapon known as the PASCALIBER. Its fast-moving blade shall impale many an insect. We pray for your safety and hope you soon resolve the worst of this horrendous infestation.
    
    Sincerely,
    DRAVRAH UNIVERSITY
    `,
    "Boss": `Dear AGENT REPPOH,

    We have received word that a powerful, somewhat supernatural INSECT QUEEN has picked up on your activities. She arrives to defend her kin and attempt to reclaim control of the KRAM II, which you, AGENT, have now so thoroughly cleaned. She is, however, the final stand of the insects. They cannot fight back against your might, and she is the last vestige of this scourge. She arrives now - so ready yourself and prepare for combat!
    
    We have wired up the levers in your current location to heal your wounds.

    Best of luck,
    DRAVRAH UNIVERSITY    
    `,
    "Victory": `Dear AGENT REPPOH,

    You have defeated the INSECT QUEEN and the insect infestations have been thoroughly eliminated. The KRAM II is safe. We thank you for your service. As for your fate, we have not yet perfected the macrofication technology to safely extract you from the KRAM II .

    As a result, you may have to remain inside the KRAM II for a while. Our deepest apologies. While you are there however, feel free to continue descending through the KRAM II's tubes and please clear out any other insects trying to invade.

    We are in your utmost debt.

    With much gratitude,
    DRAVRAH UNIVERSITY

    (Endless Mode Unlocked - Keep Playing as Long as You Like)
    (You Can Reset if You Feel Like Returning to The Beginning)
    `,
    "Credits": `BUGGED OUT

    Produced for Github Game Off 2021.

    Coding - N8

    Art/3D Models - N8

    Music - N8

    Creative Concepts - N8, Omega, and the Spoon Gang

    SFX - Freesound.org, Kwahmah_02, and InspectorJ

    Thanks for playing!
    `
}
const TextManager = {
    wait(time) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, time)
        })
    },
    waitForKey(key) {
        return new Promise((resolve, reject) => {
            window.addEventListener("keypress", e => {
                if (e.key === key || key === "Any") {
                    resolve(e.key);
                }
            })
        });
    },
    element: null,
    backgroundElement: null,
    async typeOut(element, message) {
        for (let i = 0; i < message.length + 1; i++) {
            element.innerHTML = message.slice(0, i) + (i < message.length ? "|" : "");
            await this.wait(Math.random() * 20 + 30);
        }
    },
    async scaleUp() {
        for (let i = 0; i <= 50; i++) {
            this.backgroundElement.style.transform = `scale(${i / 50})`;
            this.backgroundElement.style.opacity = i / 50;
            await this.wait(10);
        }
    },
    async scaleDown() {
        for (let i = 0; i <= 50; i++) {
            this.backgroundElement.style.transform = `scale(${1 - i / 50})`;
            this.backgroundElement.style.opacity = 1 - i / 50;
            await this.wait(10);
        }
    },
    displaying: false,
    async displayMessage(type) {
        if (!localProxy.displayedTexts.includes(type) || (type === "Victory" || type === "Credits")) {
            localProxy.displayedTexts = localProxy.displayedTexts.concat(type);
            this.displaying = true;
            this.backgroundElement.style.display = "block";
            await this.scaleUp();
            await this.typeOut(this.element, `Transmission incoming. \n (Press any key to continue)${type !== "Victory" ? "\n (Press K to skip)": ""}`);
            const key = await this.waitForKey("Any");
            if ((key !== "k" && key !== "K") || (type === "Victory" || type === "Credits")) {
                await this.typeOut(this.element, script[type] + "\n (Press any key to dismiss)");
                await this.waitForKey("Any");
            }
            await this.scaleDown();
            this.backgroundElement.style.display = "none";
            this.element.innerHTML = "";
            this.displaying = false;
        }
    }
}
export default TextManager;