'use strict';

var DownloadTask = require('../models/DownloadTask.js'),
    TASK_STATES = DownloadTask.STATES;

module.exports = Ember.Controller.extend({

    poolSize: 4,

    downloading: [],

    queue: [],

    onQueue: function(){
        while (this.next()) {}
    }.observes('queue.length'),

    isActive: function(){
        return this.get('downloading.length') > 0;
    }.property('downloading.length'),

    next: function(){
        var downloading = this.get('downloading'),
            queue = this.get('queue'),
            poolSize = this.get('poolSize'),
            task;
        if (downloading.get('length') < poolSize && queue.get('length') > 0) {
            task = queue.popObject();
            this.downloadOne(task);
            return true;
        }
        else {
            return false;
        }
    },

    downloadOne: function(task){
        var _self = this,
            resolve = task.get('resolve');

        task.set('state', TASK_STATES.DOWNLOADING);
        this.get('downloading').pushObject(task);

        var request = new XMLHttpRequest();
        request.open('GET', task.get('url'));
        request.onload = complete;
        request.onerror = retry;
        request.ontimeout = retry;
        request.onabort = retry;
        request.onprogress = progress;
        request.responseType = task.get('type');
        request.send();

        function complete(){
            _self.get('downloading').removeObject(task);
            task.set('state', TASK_STATES.FINISHED);
            _self.next();
            if (task.get('type') === '') {
                resolve(JSON.parse(request.responseText));
            }
            else {
                resolve(request.response);
            }
        }

        function progress(evt){
            if (evt.lengthComputable) {
                task.setProperties({
                    totalSize: evt.total,
                    downloadedSize: evt.loaded
                });
            }
        }

        function retry(){
            _self.tryLater(task);
        }

    },

    tryLater: function(task){
        this.get('downloading').removeObject(task);
        this.get('queue').pushObject(task);
        this.next();
    }

});