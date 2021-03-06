/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

import Queue from 'core/queue/interface';
import { QueueWorker, QueueOptions, Task, HashFn } from 'core/queue/merge/interface';
export * from 'core/queue/merge/interface';

/**
 * Implementation of a queue data structure with support of task merging by the specified hash function
 *
 * @typeparam T - task type
 * @typeparam V - task value
 */
export default class MergeQueue<T, V = unknown> extends Queue<T, V> {
	/** @override */
	get head(): CanUndef<T> {
		if (!this.length) {
			return undefined;
		}

		const obj = this.tasksMap[this.tasks[0]];
		return obj?.task;
	}

	/** @override */
	protected tasks!: string[];

	/**
	 * The map of registered tasks
	 */
	private tasksMap: Dictionary<Task<T, V>> = Object.createDict();

	/**
	 * The task hash function
	 */
	private readonly hashFn: HashFn<T>;

	/**
	 * @override
	 * @param worker
	 * @param [opts]
	 */
	constructor(worker: QueueWorker<T, V>, opts: QueueOptions<T>) {
		super(worker, opts);
		this.hashFn = opts?.hashFn || String;
	}

	/** @override */
	shift(): CanUndef<T> {
		if (!this.length) {
			return undefined;
		}

		const
			{head} = this;

		delete this.tasksMap[this.tasks[0]];
		this.tasks.shift();

		return head;
	}

	/** @override */
	clear(): void {
		super.clear();
		this.tasksMap = Object.createDict();
	}

	/** @override */
	push(task: T): Promise<V> {
		const
			hash = this.hashFn(task);

		let
			taskObj = this.tasksMap[hash];

		if (!taskObj) {
			let
				resolve;

			const promise = new Promise<V>((r) => {
				resolve = r;
			});

			taskObj = this.tasksMap[hash] = {task, promise, resolve};
			this.tasks.push(hash);
		}

		this.start();
		return taskObj.promise;
	}

	/** @override */
	protected perform(): void {
		if (!this.length) {
			this.activeWorkers--;
			return;
		}

		const
			hash = <string>this.tasks.shift(),
			taskObj = this.tasksMap[hash];

		if (!taskObj) {
			return;
		}

		const
			{task, promise, resolve} = taskObj;

		const cb = () => {
			delete this.tasksMap[hash];
			return this.deferPerform();
		};

		promise.then(cb, cb);
		this.resolveTask(task, resolve);
	}

	/**
	 * Provides a task result to the specified promise resolve function
	 *
	 * @param task
	 * @param resolve
	 */
	protected resolveTask(task: T, resolve: Function): void {
		try {
			resolve(this.worker(task));

		} catch (error) {
			resolve(Promise.reject(error));
		}
	}
}
