<?php
/**
 * Translations for Craft plugin for Craft CMS 3.x
 *
 * Translations for Craft eliminates error prone and costly copy/paste workflows for launching human translated Craft CMS web content.
 *
 * @link      http://www.acclaro.com/
 * @copyright Copyright (c) 2018 Acclaro
 */

namespace acclaro\translations\controllers;

use Craft;
use craft\web\Controller;
use yii\web\HttpException;

use acclaro\translations\Constants;
use acclaro\translations\Translations;

/**
 * @author    Acclaro
 * @package   Translations
 * @since     1.0.0
 */
class TranslatorController extends Controller
{
    /**
     * @return mixed
     */
    public function actionDelete()
    {
        $this->requireLogin();
        $this->requirePostRequest();

        if (!Translations::$plugin->userRepository->userHasAccess('translations:translator:delete')) {
            return $this->asFailure('User does not have permission to perform this action.', []);
        }

        $translatorIds = Craft::$app->getRequest()->getBodyParam('translatorIds');
        $translatorIds = explode(",", $translatorIds);

        foreach($translatorIds as $translatorId) {
            $translator = Translations::$plugin->translatorRepository->getTranslatorById($translatorId);

            if (!$translator) {
                return $this->asFailure('Invalid translator.', []);
            }

            // check if translator has any pending orders
            $pendingOrders = Translations::$plugin->orderRepository->getInProgressOrdersByTranslatorId($translatorId);
    
            $pendingOrdersCount = count($pendingOrders);
    
            if ($pendingOrdersCount > 0) {
                return $this->asFailure('The translator cannot be deleted as orders have been created already.', []);
            }
    
            Translations::$plugin->translatorRepository->deleteTranslator($translator);
        }

        $this->setSuccessFlash('Translators deleted.');

        return $this->asSuccess(null, []);
    }

    /**
     * @return mixed
     */
    public function actionSave(array $variables = array())
    {
        $this->requireLogin();
        $this->requirePostRequest();

        $variables['selectedSubnavItem'] = 'translators';
        $variables['translatorId'] = $translatorId = Craft::$app->getRequest()->getBodyParam('id');
        $variables['translationServices'] = Translations::$plugin->translatorRepository->getTranslationServices();

        $isContinue = Craft::$app->getRequest()->getBodyParam('flow') === "continue";

        if ($translatorId) {

            if (!Translations::$plugin->userRepository->userHasAccess('translations:translator:edit')) {
                return $this->asFailure(Translations::$plugin->translator->translate('app', 'User is not permitted for this operation.'));
            }

            $translator = Translations::$plugin->translatorRepository->getTranslatorById($translatorId);

            if (!$translator) {
                // throw new HttpException(400, 'Invalid Translator');
                return $this->asFailure(Translations::$plugin->translator->translate('app', 'Invalid Translator'));
            }
        } else {
            if (!Translations::$plugin->userRepository->userHasAccess('translations:translator:create')) {
                return $this->asFailure(Translations::$plugin->translator->translate('app', 'User is not permitted to create new translator.'));
            }
            $translator = Translations::$plugin->translatorRepository->makeNewTranslator();
        }

        $service = Craft::$app->getRequest()->getBodyParam('service');
        $allSettings = Craft::$app->getRequest()->getBodyParam('settings');
        $settings = $allSettings[$service] ?? array();

        $translator->label = Craft::$app->getRequest()->getBodyParam('label');
        $translator->service = $service;
        $translator->settings = json_encode($settings);
        $translator->status = Craft::$app->getRequest()->getBodyParam('status');

        //Make Export/Import Translator automatically active
        if ($translator->service !== Constants::TRANSLATOR_DEFAULT)
        {
            $auth = Translations::$plugin->services->authenticateService($service, $settings);
            if (! $auth) {
                $translator->status = "";
                $variables['translator'] = $translator;
                $this->setFailFlash(Translations::$plugin->translator->translate('app', 'Api token could not be authenticated.'));
                return $this->renderTemplate('translations/translators/_detail', $variables);
            }
        }

        $translator->status = Constants::TRANSLATOR_STATUS_ACTIVE;
        Translations::$plugin->translatorRepository->saveTranslator($translator);

        $redirectTo = $isContinue ? 'translations/translators/new' : 'translations/translators';
        return $this->asSuccess('Translator saved.', [], $redirectTo);
    }

    /**
     * @return mixed
     */
    public function actionDetail(array $variables = array())
    {
        $variables = Craft::$app->getRequest()->resolve()[1];
        
        $variables['selectedSubnavItem'] = 'translators';

        $variables['translatorId'] = isset($variables['translatorId']) ? $variables['translatorId'] : null;

        if ($variables['translatorId']) {
            $variables['translator'] = Translations::$plugin->translatorRepository->getTranslatorById($variables['translatorId']);

            if (!$variables['translator']) {
                throw new HttpException(404);
            }
        } else {
            $variables['translator'] = Translations::$plugin->translatorRepository->makeNewTranslator();
        }

        $variables['translationServices'] = Translations::$plugin->translatorRepository->getTranslationServices();

        $this->renderTemplate('translations/translators/_detail', $variables);
    }

    /**
     * @return mixed
     */
    public function actionIndex()
    {
        $variables = array();

        $variables['translators'] = Translations::$plugin->translatorRepository->getTranslators();

        $variables['translatorTargetSites'] = array();

        $variables['selectedSubnavItem'] = 'translators';
        
        $this->renderTemplate('translations/translators/_index', $variables);
    }

    /**
     * @return mixed
     */
    public function actionGetTranslators()
    {
        $this->requireLogin();
        $this->requirePostRequest();
        $translators = [];

        $service = Craft::$app->getRequest()->getBodyParam('service') ?? null;

        if ($service && $service !== "all") {
            $translators = Translations::$plugin->translatorRepository->getTranslatorByService($service);
        } else {
            $translators = Translations::$plugin->translatorRepository->getTranslators();
        }

        return $this->asSuccess(null, json_decode(json_encode($translators), true));
    }
}
