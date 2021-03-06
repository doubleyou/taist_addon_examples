->
    utils = null
    approver = null

    states = {
        'initial': {
            triggers: {
                'Send for approval': 'onApproval'
            }
        },
        'onApproval': {
            triggers: {
                'Approve': 'accepted'
                'Decline': 'declined'
            },
            titleTag: 'To Approve'
            author: true
        },  
        'accepted': {
            titleTag: 'Approved'
            owner: true
        },
        'declined': {
            triggers: {
                'Send for approval': 'onApproval'
            },  
            titleTag: 'Declined'
            owner: true
        }
    }

    wrikeConstants = {
        common: {
            classHidden: 'wrike-taist-hidden'
            hiddenClassCss: '<style> .wrike-taist-hidden {display: none;} </style>'
        },
        filters: {
            flagTemplate: '<a class="wrike-button-checkbox x-btn-noicon" href="#"></a>'
            taistFiltersContainerId: 'wrike-taist-approval-filters'
            flagsOuterContainerSelector: '.type-selector'
            flagsInnerContainerSelector: '.x-column'
            flagCheckedClass: 'x-btn-pressed'
            streamTaskSelector: '.stream-task-entry'
            streamViewButtonSelector: '.wspace_header_buttonStreamView'
        },
        task: {
            containerSelector: '.wspace-task-widgets-title-view'
            toolbarSelector: '.wspace-task-settings-bar'
            taistToolbarId: 'wrike-taist-toolbar'
            buttonTemplate: '<a class="wspace-task-settings-button"></a>'
            buttonHighlightClass: 'x-btn-over'
        }
    }

    class WrikeTaskFilters
        filter: 'All'

        cfg: wrikeConstants.filters

        renderFlags: ->
            if $('#' + @cfg.taistFiltersContainerId).length
                return
            originalFlags = $ @cfg.flagsOuterContainerSelector
            flags = originalFlags.clone()
            flags.attr 'id', @cfg.taistFiltersContainerId
            flagsContainer = flags.find(@cfg.flagsInnerContainerSelector)
            flagsContainer.empty()
            originalFlags.after flags
            self = @
            for _, state of states
                flag = $(self.cfg.flagTemplate)
                flag.text state.titleTag or 'All'
                flagsContainer.append flag
                if @filter is flag.text()
                    flag.addClass(self.cfg.flagCheckedClass)
                flag.on 'click', ->
                    flagsContainer.find('a').
                        removeClass(self.cfg.flagCheckedClass)
                    $(@).addClass(self.cfg.flagCheckedClass)
                    self.filter = $(@).text()
                    self.filterTasks()
                    false

        filterTasks: ->
            hidden = wrikeConstants.common.classHidden
            $(@cfg.streamTaskSelector).each (i, element) =>
                elm = $ element
                if @filter is 'All'
                    elm.removeClass hidden
                else
                    taskTitle = elm.find('span').text()
                    if taskTitle.match '\\[' + @filter + '\\]'
                        elm.removeClass hidden
                    else
                        elm.addClass hidden
            


    class WrikeTaskApprover
        cfg: wrikeConstants.task

        setTask: (task) ->
            if @task is task
                return
            @task = task
            @title = $(@cfg.containerSelector).find('textarea')
            @state = @stateFromTitle()

            # Have to remove the toolbar as view init event is being emmitted
            # multiple times from the stream view
            if $(@cfg.taistToolbarId).length
                return
            originalToolbar = $ @cfg.toolbarSelector
            @toolbar = originalToolbar.clone()
            @toolbar.attr 'id', @cfg.taistToolbarId
            @toolbar.empty()
            originalToolbar.after @toolbar

            roles = taistWrike.myTaskRoles(task)
            if roles.owner and states[@state].owner or roles.author and states[@state].author
                @renderControls()

        stateFromTitle: ->
            m = @title.val().match /^\[(.+)\].*/
            if not m?[1]
                return 'initial'
            for stateName, state of states
                if state.titleTag is m[1]
                    return stateName

        renderControls: ->
            cfg = @cfg
            mOver = ->
                $(@).addClass cfg.buttonHighlightClass
            mOut = ->
                $(@).removeClass cfg.buttonHighlightClass
            for buttonTitle, nextState of states[@state].triggers
                do(buttonTitle, nextState) =>
                    button = $(cfg.buttonTemplate)
                    button.text buttonTitle
                    button.hover mOver, mOut
                    button.on 'click', =>
                        @toolbar.empty()
                        @applyState nextState
                        @renderControls()
                        false
                    @toolbar.append button
                

        applyState: (newState) ->
            newPrefix = '[' + states[newState].titleTag + '] '
            if @state is 'initial'
                @title.val(newPrefix + @title.val())
            else
                @title.val(@title.val().replace(/^\[.+\]\s/, newPrefix))

            # Sequence for auto-saving modified ticket title
            @title.focus()
            $.event.trigger {type: 'keypress', which: 13 }
            @title.blur()

            @state = newState

    approver = new WrikeTaskApprover()
    filters = new WrikeTaskFilters()

    start = (utilities) ->
        utils = utilities

        style = $ wrikeConstants.common.hiddenClassCss
        $('html > head').append(style)

        taistWrike.onTaskViewRender (task) ->
            if not task
                return
            approver.setTask task

        $(wrikeConstants.filters.streamViewButtonSelector).on 'click', ->
            filters.renderFlags()
            filters.filterTasks()
            false

        if window.location.hash.match(/stream/)
            filters.renderFlags()
            filters.filterTasks()

    taistWrike =
        me: -> $wrike.user.getUid()

        myTaskRoles: (task) ->
            {
                owner: task.data['responsibleList'].indexOf(@me()) >= 0
                author: (task.get 'author') is @me()
            }

        onTaskViewRender: (callback) ->
            listenerName = 'load'
            listenersInPrototype = $wspace.task.View.prototype.xlisteners

            utils.aspect.after listenersInPrototype, listenerName, (view, task) ->
                if task?
                    task.load (loadedTask) ->
                        callback loadedTask, view
                else
                    return callback null, view

            currentTaskView = window.Ext.ComponentMgr.get ($('.wspace-task-view').attr 'id')
            currentTask = currentTaskView?['record']

            if currentTask? and currentTaskView?
                enhancedListener = listenersInPrototype[listenerName]
                currentViewListeners = currentTaskView.events[listenerName].listeners[0]
                currentViewListeners.fn = currentViewListeners.fireFn = enhancedListener

                callback currentTask, currentTaskView

        onTaskChange: (callback) ->
            utils.aspect.after Wrike.Task, 'getChanges', (-> callback @)

    {start}
