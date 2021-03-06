/*
 * Copyright 2017 Ericsson
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
  'use strict';

  describe('horizon.app.core.trunks.actions.create.service', function() {

    var $q, $scope, service, modalWaitSpinnerService, deferred, $timeout;

    var policyAPI = {
      ifAllowed: function() {
        return {
          success: function(callback) {
            callback({allowed: true});
          }
        };
      }
    };

    var wizardModalService = {
      modal: function () {
        return {
          result: undefined
        };
      }
    };

    var neutronAPI = {
      getNetworks: function() {
        return $q.when(
          {data: {items: []}}
        );
      },
      getPorts: function() {
        return $q.when(
          {data: {items: []}}
        );
      },
      createTrunk: function(trunk) {
        return $q.when(
          {data: trunk}
        );
      }
    };

    var userSession = {
      isCurrentProject: function() {
        deferred.resolve();
        return deferred.promise;
      },
      get: function() {
        return $q.when({'project_id': '1'});
      }
    };

    ////////////

    beforeEach(module('horizon.app.core'));

    beforeEach(module(function($provide) {
      $provide.value('horizon.framework.widgets.modal.wizard-modal.service',
        wizardModalService);
      $provide.value('horizon.app.core.openstack-service-api.policy',
        policyAPI);
      $provide.value('horizon.app.core.openstack-service-api.neutron',
        neutronAPI);
      $provide.value('horizon.app.core.openstack-service-api.userSession',
        userSession);
    }));

    beforeEach(inject(function($injector, $rootScope, _$q_, _$timeout_) {
      $q = _$q_;
      $timeout = _$timeout_;
      $scope = $rootScope.$new();
      deferred = $q.defer();
      service = $injector.get('horizon.app.core.trunks.actions.create.service');
      modalWaitSpinnerService = $injector.get(
          'horizon.framework.widgets.modal-wait-spinner.service'
        );
    }));

    it('should check the policy if the user is allowed to create trunks', function() {
      spyOn(policyAPI, 'ifAllowed').and.callThrough();
      var allowed = service.allowed();
      expect(allowed).toBeTruthy();
      expect(policyAPI.ifAllowed).toHaveBeenCalledWith(
        { rules: [['network', 'create_trunk']] }
      );
    });

    it('open the modal with the correct parameters', function() {
      spyOn(wizardModalService, 'modal').and.callThrough();
      spyOn(modalWaitSpinnerService, 'showModalSpinner');
      spyOn(modalWaitSpinnerService, 'hideModalSpinner');

      service.perform();
      expect(modalWaitSpinnerService.showModalSpinner).toHaveBeenCalledWith('Please Wait');
      $timeout.flush();

      expect(wizardModalService.modal).toHaveBeenCalled();
      expect(modalWaitSpinnerService.hideModalSpinner).toHaveBeenCalled();

      var modalArgs = wizardModalService.modal.calls.argsFor(0)[0];
      expect(modalArgs.scope).toBeUndefined();
      expect(modalArgs.workflow).toBeDefined();
      expect(modalArgs.submit).toBeDefined();
      expect(modalArgs.data.initTrunk).toBeDefined();
      expect(modalArgs.data.ports).toBeDefined();
    });

    it('should submit create trunk request to neutron', function() {
      spyOn(neutronAPI, 'createTrunk').and.callThrough();
      spyOn(wizardModalService, 'modal').and.callThrough();
      spyOn(modalWaitSpinnerService, 'showModalSpinner');
      spyOn(modalWaitSpinnerService, 'hideModalSpinner');

      service.perform();
      $timeout.flush();

      var modalArgs = wizardModalService.modal.calls.argsFor(0)[0];
      modalArgs.submit(
          {trunkSlices: {
            step1: function () {
              return {
                name: 'trunk name'
              };
            },
            step2: function () {
              return {
                port_id: 'parent port uuid'
              };
            },
            step3: function () {
              return {
                sub_ports: [
                  {port_id: 'subport uuid', segmentation_type: 'vlan', segmentation_id: 100}
                ]
              };
            }
          }}
      );
      $scope.$apply();

      expect(neutronAPI.createTrunk).toHaveBeenCalled();
      expect(neutronAPI.createTrunk.calls.argsFor(0)[0]).toEqual({
        name: 'trunk name',
        port_id: 'parent port uuid',
        sub_ports: [
          {port_id: 'subport uuid', segmentation_type: 'vlan', segmentation_id: 100}
        ]
      });
    });

  });

})();
