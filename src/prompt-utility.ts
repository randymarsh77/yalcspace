import Choices from 'prompt-choices';
import readline from 'readline';

const stdin = process.stdin;

export async function yesNoPrompt(question: string): Promise<boolean> {
	const answer = await prompt(question, ['Yes', 'No']);
	return answer === 0;
}

export async function prompt(question: string, answers: string[]): Promise<number> {
	const choices = new Choices(answers);
	console.log(question);
	console.log(choices.render());

	let choice = 0;

	stdin.setRawMode(true);
	stdin.resume();

	return new Promise((resolve) => {
		const moves = {
			// up
			'\u001b[A': () => {
				choice = choice - 1;
				if (choice < 0) {
					choice = choices.length - 1;
				}
			},
			// down
			'\u001b[B': () => {
				choice = (choice + 1) % choices.length;
			},
			// return
			'\r': () => {
				stdin.off('data', onKeyPress);
				stdin.setRawMode(false);
				resolve(choice);
			},
		};

		function promptLoop() {
			console.log(choices.render(choice));
		}

		function onKeyPress(keyBuffer: Buffer) {
			readline.moveCursor(process.stdout, 0, -(choices.length + 1));
			const key = keyBuffer.toString();

			// ctrl-c ( end of text )
			if (key === '\u0003') {
				process.exit();
			}

			const func = key && moves[key as keyof typeof moves];
			if (func) {
				func();
				promptLoop();
			}
		}

		stdin.setEncoding('utf8');
		stdin.on('data', onKeyPress);
	});
}
