'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('globalVisibilityConfiguration100Ctrl', globalVisibilityConfiguration100Ctrl);

  globalVisibilityConfiguration100Ctrl.$inject = ['$scope', '$http', 'connectorService', 'currentPermissionsService',
    'WizardHandler', 'toaster', 'CommonUtils', '$controller', '$window', 'API', '$resource', '$q', '$filter'];

  function globalVisibilityConfiguration100Ctrl($scope, $http, connectorService, currentPermissionsService,
    WizardHandler, toaster, CommonUtils, $controller, $window, API, $resource, $q, $filter) {
    $controller('BaseConnectorCtrl', {
      $scope: $scope
    });

    var tagToIncludePlaybook = 'create_global_visibility_records';
    $scope.processingConnector = false;
    $scope.close = close;
    $scope.movePrevious = movePrevious;
    $scope.moveEnvironmentNext = moveEnvironmentNext;
    $scope.moveVersionControlNext = moveVersionControlNext;
    $scope.versionControlConnectorName = 'remote-fortisoar';
    $scope.connectorVersion = '100.9.9';
    $scope.versionControlConnector = {};
    $scope.selectedEnv = {};
    $scope.formHolder = {};
    $scope.saveConnector = saveConnector;


    //when save is enabled disable next and back
    function saveConnector(saveFrom) {
      var data = angular.copy($scope.connector);
      if (CommonUtils.isUndefined(data) || !currentPermissionsService.availablePermission('connectors', 'update')) {
        $scope.statusChanged = false;
        return;
      }
      var newConfiguration, newConfig, deleteConfig;
      newConfiguration = false;
      if (saveFrom !== 'deleteConfigAndSave') {
        if (!_.isEmpty($scope.connector.config_schema)) {
          if (!$scope.validateConfigurationForm()) {
            return;
          }
        }
        if (!$scope.input.selectedConfiguration.id) {
          newConfiguration = true;
          $scope.input.selectedConfiguration.config_id = $window.UUID.generate();
          if ($scope.input.selectedConfiguration.default) {
            angular.forEach(data.configuration, function (configuration) {
              if (configuration.config_id !== $scope.input.selectedConfiguration.config_id) {
                configuration.default = false;
              }
            });
          }
          data.configuration.push($scope.input.selectedConfiguration);
          newConfig = $scope.input.selectedConfiguration;
        }
        delete data.newConfig;
      }

      if (saveFrom === 'deleteConfigAndSave') {
        deleteConfig = true;
      }

      var updateData = {
        connector: data.id,
        name: $scope.input.selectedConfiguration.name,
        config_id: $scope.input.selectedConfiguration.config_id,
        id: $scope.input.selectedConfiguration.id,
        default: $scope.input.selectedConfiguration.default,
        config: {},
        teams: $scope.input.selectedConfiguration.teams
      };
      $scope.saveValues($scope.input.selectedConfiguration.fields, updateData.config);
      $scope.processing = true;
      connectorService.updateConnectorConfig(updateData, newConfiguration, deleteConfig).then(function (response) {
        if (newConfig) {
          $scope.connector.configuration.push(newConfig);
          if (newConfig.default) {
            $scope.removeDefaultFromOthers();
          }

        }
        $scope.formHolder.connectorForm.$setPristine();
        if (!deleteConfig) {
          $scope.input.selectedConfiguration.id = response.id;
        }
        $scope.checkHealth();
        $scope.statusChanged = false;
      }, function (error) {
        toaster.error({
          body: error.data.message ? error.data.message : error.data['hydra:description']
        });
      }).finally(function () {
        $scope.processing = false;
      });
    }

    function close() {
      triggerPlaybook();
      $scope.$parent.$parent.$parent.$ctrl.handleClose();
    }


    function moveEnvironmentNext() {
      _loadConnectorDetails($scope.versionControlConnectorName, $scope.connectorVersion, $scope.versionControlConnector);
      WizardHandler.wizard('solutionpackWizard').next();
    }

    function moveVersionControlNext() {
      WizardHandler.wizard('solutionpackWizard').next();
    }

    function movePrevious() {
      WizardHandler.wizard('solutionpackWizard').previous();
    }

    function _loadConnectorDetails(connectorName, connectorVersion, connectorDetails) {
      $scope.processingConnector = true;
      connectorService.getConnector(connectorName, connectorVersion).then(function (connector) {
        if (!connector) {
          toaster.error({
            body: 'The Connector "' + connectorName + '" is not installed. Istall the connector and re-run thiz wizard to complete the configuration'
          });
          return;
        }
        $scope.selectedConnector = connector;
        $scope.loadConnector($scope.selectedConnector, false, false);
        $scope.processingConnector = false;
      });
    }

    function getAllPlaybooks(queryObject) {
      var defer = $q.defer();
      var url = 'api/query/workflows';
      $resource(url).save(queryObject, function (response) {
        defer.resolve(response);
      }, function (error) {
        defer.reject(error);
      });
      return defer.promise;
    }

    function triggerPlaybook() {
      var queryObjectPlaybook = {
        "sort": [
          {
            "field": "createDate",
            "direction": "DESC",
            "_fieldName": "createDate"
          }
        ],
        "limit": 1,
        "logic": "AND",
        "filters": [
          {
            "field": "recordTags",
            "value": [
              tagToIncludePlaybook
            ],
            "display": "",
            "operator": "in",
            "type": "array"
          },
          {
            "field": "isActive",
            "value": true,
            "operator": "eq"
          }
        ],
        "__selectFields": [
          "id",
          "name"
        ]

      };

      // add a tag to the playbook, get the playbook instead of hardcoding the playbook iri
      getAllPlaybooks(queryObjectPlaybook).then(function (result) {
        var queryPayload =
        {
          "request": $scope.selectedEnv
        }
        var queryUrl = '/api/triggers/1/notrigger/'+ result['hydra:member'][0]['uuid'];
        $http.post(queryUrl, queryPayload).then(function (response) {
          console.log(response);
        });
      })
    }
  }
})();