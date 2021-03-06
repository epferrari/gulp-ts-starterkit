import {Gulp, TaskFunction} from 'gulp';
import * as assert from 'assert';
import * as StrongBus from 'strongbus';
import * as DefaultRegistry from 'undertaker-registry';
import * as asyncDone from 'async-done';
import {autobind} from 'core-decorators';

import {RegistryEvents} from './events';
import {TaskContext, ContextConfig} from './taskContext';
import {TaskTracker} from './taskTracker';


type DoneCallback = (error?: any) => void;

@autobind
export class Registry<TConfig extends ContextConfig = ContextConfig> extends DefaultRegistry {
  public readonly context: TaskContext<TConfig>;
  private readonly eventbus = new StrongBus.Bus<RegistryEvents>();
  private gulp: Gulp;

  constructor(
    config: TConfig
  ) {
    super();
    assert(typeof config.rootPath === 'string', 'rootPath must be defined in Registry options');
    this.context = new TaskContext(config, this.eventbus);
  }

  public init(gulp: Gulp) {
    super.init(gulp);
    // hackish
    this.gulp = gulp;
    /* tslint:disable-next-line */
    const tracker = new TaskTracker(gulp, this.eventbus);
  }

  // lazily load task dependencies so task definitions at higher levels are injected as part of lower level chains
  public inject(taskname: string): TaskFunction {
    const lazy: TaskFunction = (done: DoneCallback) => asyncDone(this.gulp.registry().get(taskname), done);
    lazy.displayName = `[injected] ${taskname}`;

    return lazy;
  }

  public override(taskname: string, override: (original: TaskFunction) => TaskFunction): void {
    const original: TaskFunction = this.gulp.registry().get(taskname) || ((d: DoneCallback) => d());
    const overridden: TaskFunction = (done: DoneCallback) => asyncDone(override(original), done);
    overridden.displayName = `[overriden] ${taskname}`;
    this.gulp.task(taskname, overridden);
  }
}




